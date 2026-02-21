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
async function getSystemConfig() {
  try {
    let config = await prisma.systemConfig.findFirst({ where: { id: 1 } });
    if (!config) {
      // Fallback if not initialized
      config = await prisma.systemConfig.create({
        data: { id: 1, buyPrice: 3.5, sellPrice: 4.0, maintenanceFee: 1.0, networkFee: 0.1 }
      });
    }
    return config;
  } catch (err) {
    console.error("Error al obtener SystemConfig:", err.message);
    return { buyPrice: 3.5, sellPrice: 4.0, maintenanceFee: 1.0, networkFee: 0.1 };
  }
}

async function getGlobalReserve() {
  try {
    let reserve = await prisma.globalReserve.findFirst({ where: { id: 1 } });
    if (!reserve) {
      // Fallback if not initialized
      reserve = await prisma.globalReserve.create({
        data: { id: 1, totalCacaoStock: 0, tokensIssued: 0 }
      });
    }
    return reserve;
  } catch (err) {
    console.error("Error al obtener GlobalReserve:", err.message);
    return { totalCacaoStock: 0, tokensIssued: 0 };
  }
}

async function getCacaoPrice(type = 'buy') {
  const config = await getSystemConfig();
  return type === 'sell' ? config.sellPrice : config.buyPrice;
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

async function adminMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token requerido' });
  try {
    const token = header.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    const staffRoles = ['admin', 'cajero', 'oficinista'];
    if (!user || !staffRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Acceso denegado: Se requiere rol administrativo' });
    }
    req.userId = decoded.userId;
    req.user = user;
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

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Tu cuenta ha sido bloqueada. Contacta al administrador.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Se requiere contraseña actual y nueva' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'La contraseña actual es incorrecta' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashed }
    });

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BALANCE ───────────────────────────────────────────────────────────────────
app.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const config = await getSystemConfig();
    res.json({
      fiat: user.fiatBalance,
      cacao: user.cacaoBalance,
      cacaoPricePerGram: config.buyPrice, // Usamos precio de compra como referencia general
      cacaoValueInUSD: parseFloat((user.cacaoBalance * config.buyPrice).toFixed(2)),
      networkFee: config.networkFee
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

    const config = await getSystemConfig();
    const price = await getCacaoPrice(type === 'DEPOSIT_CACAO' ? 'buy' : 'sell');
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
      // Al depositar USD, podríamos restar una tasa de red si aplica, pero usualmente es en retiros/conversiones
      dataUpdate = { fiatBalance: { increment: parseFloat(amount) } };
      txData.amountUSD = parseFloat(amount);
    } else if (type === 'DEPOSIT_CACAO') {
      dataUpdate = { cacaoBalance: { increment: parseFloat(amount) } };
      txData.amountCacao = parseFloat(amount);
      txData.amountUSD = parseFloat((amount * price).toFixed(2));

      // Al depositar cacao (físico o digital), incrementamos la reserva
      // Nota: Si el usuario trae cacao físico, incrementamos tanto el stock como los tokens emitidos
      await prisma.globalReserve.update({
        where: { id: 1 },
        data: {
          totalCacaoStock: { increment: parseFloat(amount) },
          tokensIssued: { increment: parseFloat(amount) }
        }
      });
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

    const config = await getSystemConfig();
    const price = await getCacaoPrice(type === 'WITHDRAW_CACAO' ? 'sell' : 'buy');
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    // Aplicar tasa de red al retiro en USD
    const networkFee = config.networkFee;
    const totalToDebitUSD = type === 'WITHDRAW_USD' ? parseFloat(amount) + networkFee : 0;

    // Validar saldo suficiente
    if (type === 'WITHDRAW_USD' && user.fiatBalance < totalToDebitUSD) {
      return res.status(400).json({ error: `Saldo USD insuficiente (requiere ${totalToDebitUSD} incl. tasa)` });
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
      notes: notes || (type === 'WITHDRAW_USD' ? `Tasa de red: ${networkFee} USD` : null),
      status: 'PENDING',
    };

    if (type === 'WITHDRAW_USD') {
      dataUpdate = { fiatBalance: { decrement: totalToDebitUSD } };
      txData.amountUSD = parseFloat(amount);
    } else if (type === 'WITHDRAW_CACAO') {
      dataUpdate = { cacaoBalance: { decrement: parseFloat(amount) } };
      txData.amountCacao = parseFloat(amount);
      txData.amountUSD = parseFloat((amount * price).toFixed(2));

      // Al retirar cacao, decrementamos la reserva global
      await prisma.globalReserve.update({
        where: { id: 1 },
        data: {
          totalCacaoStock: { decrement: parseFloat(amount) },
          tokensIssued: { decrement: parseFloat(amount) }
        }
      });
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
    if (!type || !amount || amount <= 0) return res.status(400).json({ error: 'Datos inválidos' });

    const config = await getSystemConfig();
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    let dataUpdate = {};
    let txData = { type, amount: parseFloat(amount), status: 'COMPLETED', priceAt: 0 };

    if (type === 'CONVERT_CACAO_TO_USD') {
      const price = config.buyPrice;
      if (user.cacaoBalance < amount) return res.status(400).json({ error: 'Gramos de cacao insuficientes' });

      const usd = parseFloat((amount * price).toFixed(2));
      dataUpdate = {
        cacaoBalance: { decrement: parseFloat(amount) },
        fiatBalance: { increment: usd }
      };

      txData.priceAt = price;
      txData.amountCacao = parseFloat(amount);
      txData.amountUSD = usd;

      await prisma.globalReserve.update({
        where: { id: 1 },
        data: { tokensIssued: { decrement: parseFloat(amount) } }
      });

    } else if (type === 'CONVERT_USD_TO_CACAO') {
      const price = config.sellPrice;
      if (user.fiatBalance < amount) return res.status(400).json({ error: 'Saldo USD insuficiente' });

      const cacao = parseFloat((amount / price).toFixed(4));

      // Verificación de Reserva Global
      const reserve = await getGlobalReserve();
      const available = reserve.totalCacaoStock - reserve.tokensIssued;
      if (cacao > available) {
        return res.status(400).json({ error: 'Lo sentimos, no hay cacao disponible para intercambio en este momento' });
      }

      dataUpdate = {
        fiatBalance: { decrement: parseFloat(amount) },
        cacaoBalance: { increment: cacao }
      };

      txData.priceAt = price;
      txData.amountUSD = parseFloat(amount);
      txData.amountCacao = cacao;

      await prisma.globalReserve.update({
        where: { id: 1 },
        data: { tokensIssued: { increment: cacao } }
      });

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
      priceUsed: txData.priceAt
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
    const config = await getSystemConfig();
    res.json({
      buyPrice: config.buyPrice,
      sellPrice: config.sellPrice,
      currency: 'USD'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SYSTEM CONFIG (ADMIN) ─────────────────────────────────────────────────────
const getGeminiPrice = require('./precioCacao');

app.get('/admin/config', adminMiddleware, async (req, res) => {
  try {
    const { refresh } = req.query;
    const config = await getSystemConfig();

    // Solo consultar Gemini si se solicita explícitamente vía ?refresh=true
    if (refresh === 'true') {
      const geminiData = await getGeminiPrice();

      // Actualizar configuración en la DB si recibimos datos de Gemini
      if (geminiData) {
        const updated = await prisma.systemConfig.update({
          where: { id: 1 },
          data: {
            marketTonPrice: geminiData.marketPriceTon,
            lastMarketPrice: geminiData.buyPriceGram,
            // NOTA: No sobreescribimos buyPrice/sellPrice operativos automáticamente 
            // a menos que el admin lo decida, pero guardamos la última referencia.
          }
        });

        return res.json({
          ...updated,
          currentMarketTonPrice: geminiData.marketPriceTon,
          suggestedBuyPriceGram: geminiData.buyPriceGram,
          suggestedSellPriceGram: geminiData.sellPriceGram
        });
      }
    }

    // Por defecto, solo devolver lo que hay en la DB
    res.json({
      ...config,
      currentMarketTonPrice: config.marketTonPrice,
      suggestedBuyPriceGram: config.lastMarketPrice,
      suggestedSellPriceGram: config.lastMarketPrice ? config.lastMarketPrice * 1.15 : 0 // Fallback visual
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/admin/config', adminMiddleware, async (req, res) => {
  try {
    const { buyPrice, sellPrice, maintenanceFee, networkFee } = req.body;
    const updated = await prisma.systemConfig.update({
      where: { id: 1 },
      data: {
        buyPrice: buyPrice !== undefined ? parseFloat(buyPrice) : undefined,
        sellPrice: sellPrice !== undefined ? parseFloat(sellPrice) : undefined,
        maintenanceFee: maintenanceFee !== undefined ? parseFloat(maintenanceFee) : undefined,
        networkFee: networkFee !== undefined ? parseFloat(networkFee) : undefined,
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN OPERATIONS ──────────────────────────────────────────────────────────
app.get('/admin/users', adminMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, name: true, phone: true, cedula: true,
        role: true, status: true, fiatBalance: true, cacaoBalance: true,
        createdAt: true
      }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/users', adminMiddleware, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name, role: role || 'user' }
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/admin/users/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, cedula, role, status, fiatBalance, cacaoBalance } = req.body;

    // Solo el rol 'admin' puede cambiar el estado de un usuario
    if (status !== undefined && req.user.role !== 'admin') {
      const existingUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
      if (existingUser.status !== status) {
        return res.status(403).json({ error: 'Acceso denegado: Solo administradores pueden bloquear/desbloquear usuarios' });
      }
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        name, phone, cedula, role, status,
        fiatBalance: fiatBalance !== undefined ? parseFloat(fiatBalance) : undefined,
        cacaoBalance: cacaoBalance !== undefined ? parseFloat(cacaoBalance) : undefined
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN RESERVA ─────────────────────────────────────────────────────────────
app.get('/admin/reserve', adminMiddleware, async (req, res) => {
  try {
    const reserve = await getGlobalReserve();
    const config = await getSystemConfig();

    // Gramos en manos de clientes = tokensIssued
    // Gramos disponibles para la venta = totalCacaoStock - tokensIssued
    // Valor total de la reserva = totalCacaoStock * buyPrice

    res.json({
      ...reserve,
      availableStock: Math.max(0, reserve.totalCacaoStock - reserve.tokensIssued),
      totalReserveValueUSD: parseFloat((reserve.totalCacaoStock * config.buyPrice).toFixed(2))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/reserve/deposit', adminMiddleware, async (req, res) => {
  try {
    const { amount, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Cantidad inválida' });

    const updated = await prisma.globalReserve.update({
      where: { id: 1 },
      data: {
        totalCacaoStock: { increment: parseFloat(amount) }
      }
    });

    res.json({
      message: `Inyección de ${amount}g de cacao físico registrada exitosamente`,
      reserve: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Koawallet Backend corriendo en http://localhost:${PORT}`));