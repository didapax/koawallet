const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const prisma = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'koawallet_secret_2026';

// ─── Precio del cacao ─────────────────────────────────────────────────────────
async function getCacaoPrice() {
  // Precio fijo por gramo (USD) hasta configurar API real
  const fixed = parseFloat(process.env.CACAO_PRICE_FIXED || '3.50');
  return fixed;
}

// ─── Middleware Auth ───────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token requerido' });
  try {
    const token = header.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// ─── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'El email ya está registrado' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name: name || null }
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BALANCE ───────────────────────────────────────────────────────────────────
app.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const price = await getCacaoPrice();
    res.json({
      fiat: user.fiatBalance,
      cacao: user.cacaoBalance,
      cacaoPricePerGram: price,
      cacaoValueInUSD: parseFloat((user.cacaoBalance * price).toFixed(2))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DEPOSITAR ─────────────────────────────────────────────────────────────────
app.post('/deposit', authMiddleware, async (req, res) => {
  try {
    const { type, amount, method, bankOptionId, notes } = req.body;
    // type: "DEPOSIT_CACAO" | "DEPOSIT_USD"
    if (!type || !amount || amount <= 0) return res.status(400).json({ error: 'Datos inválidos' });

    const price = await getCacaoPrice();
    let dataUpdate = {};
    let txData = {
      type,
      amount: parseFloat(amount),
      priceAt: price,
      method: method || null,
      bankOptionId: bankOptionId ? parseInt(bankOptionId) : null,
      notes: notes || null,
      status: 'PENDING',
    };

    if (type === 'DEPOSIT_USD') {
      dataUpdate = { fiatBalance: { increment: parseFloat(amount) } };
      txData.amountUSD = parseFloat(amount);
    } else if (type === 'DEPOSIT_CACAO') {
      dataUpdate = { cacaoBalance: { increment: parseFloat(amount) } };
      txData.amountCacao = parseFloat(amount);
      txData.amountUSD = parseFloat((amount * price).toFixed(2));
    } else {
      return res.status(400).json({ error: 'Tipo de depósito inválido' });
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...dataUpdate,
        transactions: { create: txData }
      }
    });

    res.json({
      message: 'Depósito registrado (pendiente de confirmación)',
      fiat: user.fiatBalance,
      cacao: user.cacaoBalance
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── RETIRAR ───────────────────────────────────────────────────────────────────
app.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const { type, amount, method, bankOptionId, notes } = req.body;
    if (!type || !amount || amount <= 0) return res.status(400).json({ error: 'Datos inválidos' });

    const price = await getCacaoPrice();
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    // Validar saldo suficiente
    if (type === 'WITHDRAW_USD' && user.fiatBalance < amount) {
      return res.status(400).json({ error: 'Saldo USD insuficiente' });
    }
    if (type === 'WITHDRAW_CACAO' && user.cacaoBalance < amount) {
      return res.status(400).json({ error: 'Saldo de cacao insuficiente' });
    }

    let dataUpdate = {};
    let txData = {
      type,
      amount: parseFloat(amount),
      priceAt: price,
      method: method || null,
      bankOptionId: bankOptionId ? parseInt(bankOptionId) : null,
      notes: notes || null,
      status: 'PENDING',
    };

    if (type === 'WITHDRAW_USD') {
      dataUpdate = { fiatBalance: { decrement: parseFloat(amount) } };
      txData.amountUSD = parseFloat(amount);
    } else if (type === 'WITHDRAW_CACAO') {
      dataUpdate = { cacaoBalance: { decrement: parseFloat(amount) } };
      txData.amountCacao = parseFloat(amount);
      txData.amountUSD = parseFloat((amount * price).toFixed(2));
    } else {
      return res.status(400).json({ error: 'Tipo de retiro inválido' });
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...dataUpdate,
        transactions: { create: txData }
      }
    });

    res.json({
      message: 'Retiro solicitado (pendiente de confirmación)',
      fiat: updated.fiatBalance,
      cacao: updated.cacaoBalance
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CONVERTIR ─────────────────────────────────────────────────────────────────
app.post('/convert', authMiddleware, async (req, res) => {
  try {
    const { type, amount } = req.body;
    // type: "CONVERT_CACAO_TO_USD" | "CONVERT_USD_TO_CACAO"
    if (!type || !amount || amount <= 0) return res.status(400).json({ error: 'Datos inválidos' });

    const price = await getCacaoPrice();
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    let dataUpdate = {};
    let txData = { type, amount: parseFloat(amount), priceAt: price, status: 'COMPLETED' };

    if (type === 'CONVERT_CACAO_TO_USD') {
      if (user.cacaoBalance < amount) return res.status(400).json({ error: 'Gramos de cacao insuficientes' });
      const usd = parseFloat((amount * price).toFixed(2));
      dataUpdate = {
        cacaoBalance: { decrement: parseFloat(amount) },
        fiatBalance: { increment: usd }
      };
      txData.amountCacao = parseFloat(amount);
      txData.amountUSD = usd;
    } else if (type === 'CONVERT_USD_TO_CACAO') {
      if (user.fiatBalance < amount) return res.status(400).json({ error: 'Saldo USD insuficiente' });
      const cacao = parseFloat((amount / price).toFixed(4));
      dataUpdate = {
        fiatBalance: { decrement: parseFloat(amount) },
        cacaoBalance: { increment: cacao }
      };
      txData.amountUSD = parseFloat(amount);
      txData.amountCacao = cacao;
    } else {
      return res.status(400).json({ error: 'Tipo de conversión inválido' });
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...dataUpdate,
        transactions: { create: txData }
      }
    });

    res.json({
      message: 'Conversión exitosa',
      fiat: updated.fiatBalance,
      cacao: updated.cacaoBalance,
      priceUsed: price
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BANCOS ────────────────────────────────────────────────────────────────────
app.get('/banks', async (req, res) => {
  try {
    const banks = await prisma.bankOption.findMany({
      where: { isActive: true },
      orderBy: [{ country: 'asc' }, { bankName: 'asc' }]
    });
    res.json(banks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MÉTODOS DE PAGO ───────────────────────────────────────────────────────────
app.get('/payment-methods', async (req, res) => {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { isActive: true }
    });
    res.json(methods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PERFIL ────────────────────────────────────────────────────────────────────
app.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, email: true, name: true, phone: true, cedula: true,
        bankCountry: true, bankName: true, bankAccount: true, bankHolder: true, bankType: true,
        fiatBalance: true, cacaoBalance: true, createdAt: true
      }
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, cedula, bankCountry, bankName, bankAccount, bankHolder, bankType } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name: name ?? undefined,
        phone: phone ?? undefined,
        cedula: cedula ?? undefined,
        bankCountry: bankCountry ?? undefined,
        bankName: bankName ?? undefined,
        bankAccount: bankAccount ?? undefined,
        bankHolder: bankHolder ?? undefined,
        bankType: bankType ?? undefined,
      },
      select: {
        id: true, email: true, name: true, phone: true, cedula: true,
        bankCountry: true, bankName: true, bankAccount: true, bankHolder: true, bankType: true
      }
    });
    res.json({ message: 'Perfil actualizado', user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TRANSACCIONES ─────────────────────────────────────────────────────────────
app.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId },
      include: { bankOption: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PRECIO CACAO ──────────────────────────────────────────────────────────────
app.get('/cacao-price', async (req, res) => {
  try {
    const price = await getCacaoPrice();
    res.json({ pricePerGram: price, currency: 'USD' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Koawallet Backend corriendo en http://localhost:${PORT}`));