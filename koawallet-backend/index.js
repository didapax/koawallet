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
        data: { id: 1, buyPrice: 3.5, sellPrice: 4.0, maintenanceFee: 1.0, networkFee: 0.1, usdVesRate: 36.5 }
      });
    }
    return config;
  } catch (err) {
    console.error("Error al obtener SystemConfig:", err.message);
    return { buyPrice: 3.5, sellPrice: 4.0, maintenanceFee: 1.0, networkFee: 0.1, usdVesRate: 36.5 };
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
async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token requerido' });
  try {
    const token = header.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user still exists
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      console.log(`[AUTH] Ghost user token: User ID ${decoded.userId} not found`);
      return res.status(401).json({ error: 'Sesión inválida: Usuario no encontrado' });
    }

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

    if (!user) {
      console.log(`[AUTH] Ghost user token in admin: User ID ${decoded.userId} not found`);
      return res.status(401).json({ error: 'Sesión inválida: Usuario no encontrado' });
    }

    const staffRoles = ['admin', 'cajero', 'oficinista'];
    if (!staffRoles.includes(user.role?.toLowerCase())) {
      console.log(`[AUTH] Access denied: User ${user.email} (ID: ${user.id}) with role "${user.role}" attempted admin access`);
      return res.status(403).json({ error: 'Acceso denegado: Se requiere rol administrativo' });
    }
    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

async function isProfileComplete(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, phone: true, cedula: true }
  });
  if (!user) return false;
  return !!(user.name && user.phone && user.cedula);
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
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, cedula: user.cedula }
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
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, cedula: user.cedula, role: user.role }
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
      cacaoLocked: user.cacaoLocked,
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
    const { type, amount, method, bankOptionId, notes, paymentMethodId, fiatAmount, reference } = req.body;

    if (!await isProfileComplete(req.userId)) {
      return res.status(403).json({ error: 'Debes completar tu perfil (Nombre, Cédula y Teléfono) antes de realizar depósitos o compras.' });
    }

    if (!type) return res.status(400).json({ error: 'Tipo de transacción requerido' });
    console.log(`[DEPOSIT] Request for ${type}:`, JSON.stringify(req.body));
    const config = await getSystemConfig();

    // ── Flujo de COMPRA (BUY): Usuario paga en fiat y recibe gramos ─────────────
    if (type === 'BUY') {
      if (!paymentMethodId || !fiatAmount || parseFloat(fiatAmount) <= 0) {
        return res.status(400).json({ error: 'Monto y método de pago requeridos' });
      }

      const pm = await prisma.paymentMethod.findUnique({ where: { id: parseInt(paymentMethodId) } });
      if (!pm || !pm.isActive) return res.status(400).json({ error: 'Método de pago no disponible' });

      const cacaoPriceUSD = config.buyPrice;
      const exchangeRate = config.usdVesRate;
      const parsedFiat = parseFloat(fiatAmount);

      // Calcular gramos según la moneda del método
      let gramsAmount;
      if (pm.currency === 'VES') {
        gramsAmount = parseFloat(((parsedFiat / exchangeRate) / cacaoPriceUSD).toFixed(4));
      } else {
        // USD, USDT u otro
        gramsAmount = parseFloat((parsedFiat / cacaoPriceUSD).toFixed(4));
      }

      if (gramsAmount <= 0) return res.status(400).json({ error: 'Monto insuficiente para calcular gramos' });

      // Verificación de Stock Administrativamente Disponible para Venta
      const reserve = await getGlobalReserve();
      const available = Math.max(0, reserve.totalCacaoStock - reserve.tokensIssued);
      if (gramsAmount > available) {
        return res.status(400).json({
          error: `Lo sentimos, no hay suficiente cacao disponible para la venta en este momento (Disponible: ${available.toFixed(2)}g)`
        });
      }

      const tx = await prisma.transaction.create({
        data: {
          userId: req.userId,
          type: 'BUY',
          amount: gramsAmount,
          fiatAmount: parsedFiat,
          gramsAmount,
          cacaoPriceUSD,
          exchangeRate: pm.currency === 'VES' ? exchangeRate : 1,
          amountUSD: pm.currency === 'VES' ? parseFloat((parsedFiat / exchangeRate).toFixed(2)) : parsedFiat,
          amountCacao: gramsAmount,
          paymentMethodId: parseInt(paymentMethodId),
          reference: reference || null,
          notes: notes || null,
          status: 'PENDING',
        }
      });

      return res.status(201).json({
        message: 'Solicitud de compra registrada. Pendiente de confirmación por el cajero.',
        transactionId: tx.id,
        gramsAmount,
        estimatedUSD: pm.currency === 'VES' ? parseFloat((parsedFiat / exchangeRate).toFixed(2)) : parsedFiat,
      });
    }

    // ── Flujo legado (DEPOSIT_USD / DEPOSIT_CACAO) ────────────────────────────
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Datos inválidos' });

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
      dataUpdate = { fiatBalance: { increment: parseFloat(amount) } };
      txData.amountUSD = parseFloat(amount);
    } else if (type === 'DEPOSIT_CACAO') {
      dataUpdate = { cacaoBalance: { increment: parseFloat(amount) } };
      txData.amountCacao = parseFloat(amount);
      txData.amountUSD = parseFloat((amount * price).toFixed(2));
      await prisma.globalReserve.update({
        where: { id: 1 },
        data: { totalCacaoStock: { increment: parseFloat(amount) }, tokensIssued: { increment: parseFloat(amount) } }
      });
    } else {
      return res.status(400).json({ error: 'Tipo de depósito inválido' });
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { ...dataUpdate, transactions: { create: txData } }
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
    const { type, amount, method, bankOptionId, notes, gramsAmount, userPaymentMethodId } = req.body;

    if (!await isProfileComplete(req.userId)) {
      return res.status(403).json({ error: 'Debes completar tu perfil (Nombre, Cédula y Teléfono) antes de realizar retiros o ventas.' });
    }

    if (!type) return res.status(400).json({ error: 'Tipo de transacción requerido' });

    const config = await getSystemConfig();

    // ── Flujo de VENTA (SELL): Usuario vende gramos y recibe dinero en su cuenta ─
    if (type === 'SELL') {
      if (!gramsAmount || parseFloat(gramsAmount) <= 0) {
        return res.status(400).json({ error: 'Cantidad de gramos requerida' });
      }
      if (!userPaymentMethodId) {
        return res.status(400).json({ error: 'Cuenta de destino requerida' });
      }

      const grams = parseFloat(gramsAmount);
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (user.cacaoBalance < grams) {
        return res.status(400).json({ error: `Saldo de cacao insuficiente (disponible: ${user.cacaoBalance.toFixed(4)}g)` });
      }

      const upm = await prisma.userPaymentMethod.findUnique({
        where: { id: parseInt(userPaymentMethodId) },
        include: { paymentMethod: true }
      });
      if (!upm || upm.userId !== req.userId) {
        return res.status(400).json({ error: 'Cuenta de destino no válida' });
      }

      const cacaoPriceUSD = config.sellPrice;
      const exchangeRate = config.usdVesRate;
      const amountUSD = parseFloat((grams * cacaoPriceUSD).toFixed(2));
      const networkFeeUSD = config.networkFee;

      // La tasa se resta del monto total en la moneda del método de pago
      const isVES = upm.paymentMethod.currency === 'VES';
      const feeInMethodCurrency = isVES
        ? parseFloat((networkFeeUSD * exchangeRate).toFixed(2))
        : networkFeeUSD;

      const grossFiatAmount = isVES
        ? parseFloat((amountUSD * exchangeRate).toFixed(2))
        : amountUSD;

      const netFiatAmount = parseFloat((grossFiatAmount - feeInMethodCurrency).toFixed(2));

      // Bloquear gramos del usuario
      await prisma.user.update({
        where: { id: req.userId },
        data: {
          cacaoBalance: { decrement: grams },
          cacaoLocked: { increment: grams }
        }
      });

      const tx = await prisma.transaction.create({
        data: {
          userId: req.userId,
          type: 'SELL',
          amount: grams,
          gramsAmount: grams,
          cacaoPriceUSD,
          exchangeRate: isVES ? exchangeRate : 1,
          amountCacao: grams,
          amountUSD,
          fiatAmount: netFiatAmount, // Almacenamos el monto NETO para el cajero
          userPaymentMethodId: parseInt(userPaymentMethodId),
          notes: notes ? `${notes} (Tasa Red: ${feeInMethodCurrency} ${upm.paymentMethod.currency})` : `Tasa Red: ${feeInMethodCurrency} ${upm.paymentMethod.currency}`,
          status: 'PENDING',
        }
      });

      const updatedUser = await prisma.user.findUnique({ where: { id: req.userId } });
      return res.status(201).json({
        message: 'Solicitud de venta registrada. Los gramos han sido bloqueados. Un cajero procesará el pago.',
        transactionId: tx.id,
        gramsLocked: grams,
        estimatedUSD: amountUSD,
        netFiatAmount: netFiatAmount,
        networkFee: feeInMethodCurrency,
        currency: upm.paymentMethod.currency,
        cacao: updatedUser.cacaoBalance,
        cacaoLocked: updatedUser.cacaoLocked,
      });
    }

    // ── Flujo legado WITHDRAW_USD / WITHDRAW_CACAO ────────────────────────────
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Datos inválidos' });

    const price = await getCacaoPrice(type === 'WITHDRAW_CACAO' ? 'sell' : 'buy');
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const networkFee = config.networkFee;
    const totalToDebitUSD = type === 'WITHDRAW_USD' ? parseFloat(amount) + networkFee : 0;

    if (type === 'WITHDRAW_USD' && user.fiatBalance < totalToDebitUSD) {
      return res.status(400).json({ error: `Saldo USD insuficiente (requiere ${totalToDebitUSD} incl. tasa)` });
    }
    if (type === 'WITHDRAW_CACAO' && user.cacaoBalance < parseFloat(amount)) {
      return res.status(400).json({ error: 'Saldo de cacao insuficiente' });
    }

    let dataUpdate = {};
    let txData = {
      type, amount: parseFloat(amount), priceAt: price,
      method: method || null,
      bankOptionId: bankOptionId ? parseInt(bankOptionId) : null,
      notes: notes || (type === 'WITHDRAW_USD' ? `Tasa de red: ${networkFee} USD` : null),
      status: 'PENDING',
    };

    if (type === 'WITHDRAW_USD') {
      dataUpdate = { fiatBalance: { decrement: totalToDebitUSD } };
      txData.amountUSD = parseFloat(amount);
    } else if (type === 'WITHDRAW_CACAO') {
      dataUpdate = { cacaoBalance: { decrement: parseFloat(amount) }, cacaoLocked: { increment: parseFloat(amount) } };
      txData.amountCacao = parseFloat(amount);
      txData.amountUSD = parseFloat((parseFloat(amount) * price).toFixed(2));
      txData.gramsAmount = parseFloat(amount);
    } else {
      return res.status(400).json({ error: 'Tipo de retiro inválido' });
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { ...dataUpdate, transactions: { create: txData } }
    });

    res.json({
      message: 'Retiro solicitado (pendiente de confirmación)',
      fiat: updated.fiatBalance,
      cacao: updated.cacaoBalance,
      cacaoLocked: updated.cacaoLocked
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CONVERTIR ─────────────────────────────────────────────────────────────────
app.post('/convert', authMiddleware, async (req, res) => {
  try {
    const { type, amount } = req.body;

    if (!await isProfileComplete(req.userId)) {
      return res.status(403).json({ error: 'Debes completar tu perfil (Nombre, Cédula y Teléfono) antes de realizar conversiones.' });
    }

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

// ─── CENTROS DE ACOPIO (PÚBLICO) ───────────────────────────────────────────────
app.get('/collection-centers', async (req, res) => {
  try {
    const centers = await prisma.collectionCenter.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, address: true, city: true, phone: true,
        managerName: true, operatingHours: true, googleMapsUrl: true,
        latitude: true, longitude: true
      },
      orderBy: { city: 'asc' }
    });
    res.json(centers);
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

// ─── MÉTODOS DE PAGO DEL USUARIO (UserPaymentMethod) ──────────────────────────
app.get('/user/payment-methods', authMiddleware, async (req, res) => {
  try {
    const methods = await prisma.userPaymentMethod.findMany({
      where: { userId: req.userId },
      include: { paymentMethod: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(methods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/user/payment-methods', authMiddleware, async (req, res) => {
  try {
    const { paymentMethodId, accountHolder, accountNumber, accountType, bankName } = req.body;
    if (!paymentMethodId || !accountHolder || !accountNumber) {
      return res.status(400).json({ error: 'Faltan datos de la cuenta' });
    }

    // Validar que el método de pago existe y está activo
    const pm = await prisma.paymentMethod.findUnique({ where: { id: parseInt(paymentMethodId) } });
    if (!pm || !pm.isActive) return res.status(400).json({ error: 'Método de pago no disponible' });

    const upm = await prisma.userPaymentMethod.create({
      data: {
        userId: req.userId,
        paymentMethodId: parseInt(paymentMethodId),
        accountHolder,
        accountNumber,
        accountType: accountType || null,
        bankName: bankName || null,
      },
      include: { paymentMethod: true }
    });
    res.status(201).json(upm);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya tienes una cuenta registrada para este método de pago' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put('/user/payment-methods/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { accountHolder, accountNumber, accountType, bankName, currentPassword } = req.body;

    // Verificar contraseña
    if (!currentPassword) return res.status(400).json({ error: 'Se requiere contraseña para modificar la cuenta' });
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const bcrypt = require('bcrypt');
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });

    // Verificar propiedad
    const existing = await prisma.userPaymentMethod.findUnique({ where: { id: parseInt(id) } });
    if (!existing || existing.userId !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta cuenta' });
    }

    const updated = await prisma.userPaymentMethod.update({
      where: { id: parseInt(id) },
      data: {
        accountHolder: accountHolder ?? undefined,
        accountNumber: accountNumber ?? undefined,
        accountType: accountType ?? undefined,
        bankName: bankName ?? undefined,
      },
      include: { paymentMethod: true }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/user/payment-methods/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    // Verificar contraseña
    if (!password) {
      return res.status(400).json({ error: 'Se requiere la contraseña para eliminar la cuenta' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Verificar propiedad y existencia
    const upm = await prisma.userPaymentMethod.findUnique({ where: { id: parseInt(id) } });
    if (!upm || upm.userId !== req.userId) {
      return res.status(404).json({ error: 'La cuenta no existe o no tienes permiso para eliminarla' });
    }

    await prisma.userPaymentMethod.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Cuenta de cobro eliminada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Payment Methods CRUD
app.get('/admin/payment-methods', adminMiddleware, async (req, res) => {
  try {
    const methods = await prisma.paymentMethod.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(methods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/payment-methods', adminMiddleware, async (req, res) => {
  try {
    const { type, name, currency, details, instructions, isActive } = req.body;
    const method = await prisma.paymentMethod.create({
      data: { type, name, currency, details, instructions, isActive: isActive !== undefined ? !!isActive : true }
    });
    res.status(201).json(method);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/admin/payment-methods/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, name, currency, details, instructions, isActive } = req.body;
    const updated = await prisma.paymentMethod.update({
      where: { id: parseInt(id) },
      data: { type, name, currency, details, instructions, isActive: isActive !== undefined ? !!isActive : undefined }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/admin/payment-methods/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // We do soft delete by default
    await prisma.paymentMethod.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });
    res.json({ message: 'Método de pago desactivado' });
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
    const { name, phone, cedula } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name: name ?? undefined,
        phone: phone ?? undefined,
        cedula: cedula ?? undefined,
      },
      select: {
        id: true, email: true, name: true, phone: true, cedula: true
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
      usdVesRate: config.usdVesRate,
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
    const { buyPrice, sellPrice, maintenanceFee, networkFee, usdVesRate } = req.body;
    const updated = await prisma.systemConfig.update({
      where: { id: 1 },
      data: {
        buyPrice: buyPrice !== undefined ? parseFloat(buyPrice) : undefined,
        sellPrice: sellPrice !== undefined ? parseFloat(sellPrice) : undefined,
        maintenanceFee: maintenanceFee !== undefined ? parseFloat(maintenanceFee) : undefined,
        networkFee: networkFee !== undefined ? parseFloat(networkFee) : undefined,
        usdVesRate: usdVesRate !== undefined ? parseFloat(usdVesRate) : undefined,
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

// ─── COLECCIÓN DE CENTROS (ADMIN) ─────────────────────────────────────────────
app.get('/admin/collection-centers', adminMiddleware, async (req, res) => {
  try {
    const centers = await prisma.collectionCenter.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(centers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/collection-centers', adminMiddleware, async (req, res) => {
  try {
    const { name, address, city, phone, managerName, operatingHours, latitude, longitude, googleMapsUrl } = req.body;
    const center = await prisma.collectionCenter.create({
      data: {
        name,
        address,
        city,
        phone,
        managerName,
        operatingHours,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        googleMapsUrl,
        currentStock: 0
      }
    });
    res.status(201).json(center);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/admin/collection-centers/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, phone, managerName, operatingHours, latitude, longitude, googleMapsUrl, currentStock, isActive } = req.body;
    const updated = await prisma.collectionCenter.update({
      where: { id: parseInt(id) },
      data: {
        name,
        address,
        city,
        phone,
        managerName,
        operatingHours,
        latitude: latitude !== undefined ? (latitude ? parseFloat(latitude) : null) : undefined,
        longitude: longitude !== undefined ? (longitude ? parseFloat(longitude) : null) : undefined,
        googleMapsUrl,
        currentStock: currentStock !== undefined ? parseFloat(currentStock) : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/admin/collection-centers/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.collectionCenter.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Centro de acopio eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── COLA DEL CAJERO (ADMIN) ────────────────────────────────────────────────
app.get('/admin/transactions/pending', adminMiddleware, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'PENDING',
        type: { in: ['BUY', 'SELL', 'DEPOSIT_CACAO', 'WITHDRAW_USD', 'DEPOSIT_USD', 'WITHDRAW_CACAO'] }
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, cedula: true } },
        paymentMethod: true,
        userPaymentMethod: {
          include: { paymentMethod: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/transactions/:id/approve', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const tx = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      include: { user: true }
    });

    if (!tx || tx.status !== 'PENDING') {
      return res.status(400).json({ error: 'Transacción no válida o ya procesada' });
    }

    const config = await getSystemConfig();

    await prisma.$transaction(async (p) => {
      // 1. Update Transaction
      await p.transaction.update({
        where: { id: tx.id },
        data: { status: 'COMPLETED', adminNotes, updatedAt: new Date() }
      });

      // 2. Business Logic
      if (tx.type === 'BUY') {
        // Compra: El usuario paga FIAT y recibe Gramos (Tokens)
        const grams = tx.gramsAmount || (tx.fiatAmount / tx.cacaoPriceUSD);

        // Volver a verificar stock al momento de aprobar
        const reserve = await getGlobalReserve();
        const available = Math.max(0, reserve.totalCacaoStock - reserve.tokensIssued);
        if (grams > available) {
          throw new Error(`Stock insuficiente para aprobar esta compra. Disponible: ${available.toFixed(2)}g, Requerido: ${grams.toFixed(2)}g`);
        }

        await p.user.update({
          where: { id: tx.userId },
          data: { cacaoBalance: { increment: grams } }
        });
        // Actualizar Reserva: Se incrementan los tokens emitidos (reduce el stock disponible para la venta)
        await p.globalReserve.update({
          where: { id: 1 },
          data: {
            tokensIssued: { increment: grams }
          }
        });
      } else if (tx.type === 'SELL') {
        // Venta: El usuario entrega Gramos (Tokens) y recibe FIAT
        const grams = tx.gramsAmount;
        await p.user.update({
          where: { id: tx.userId },
          data: { cacaoLocked: { decrement: grams } }
        });
        // Actualizar Reserva: Se reducen los tokens emitidos (vuelven a estar disponibles para la venta)
        await p.globalReserve.update({
          where: { id: 1 },
          data: {
            tokensIssued: { decrement: grams }
          }
        });
      } else if (tx.type === 'WITHDRAW_CACAO') {
        // Legacy/Direct withdraw
        await p.user.update({
          where: { id: tx.userId },
          data: { cacaoLocked: { decrement: tx.amount } }
        });
        await p.globalReserve.update({
          where: { id: 1 },
          data: {
            totalCacaoStock: { decrement: tx.amount },
            tokensIssued: { decrement: tx.amount }
          }
        });
      } else if (tx.type === 'DEPOSIT_CACAO') {
        // Handled in existing verify route usually, but here if needed
        await p.user.update({
          where: { id: tx.userId },
          data: { cacaoBalance: { increment: tx.amount } }
        });
      }
    });

    res.json({ message: 'Transacción aprobada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/transactions/:id/reject', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const tx = await prisma.transaction.findUnique({
      where: { id: parseInt(id) }
    });

    if (!tx || tx.status !== 'PENDING') {
      return res.status(400).json({ error: 'Transacción no válida o ya procesada' });
    }

    await prisma.$transaction(async (p) => {
      // 1. Update Transaction
      await p.transaction.update({
        where: { id: tx.id },
        data: { status: 'REJECTED', adminNotes, updatedAt: new Date() }
      });

      // 2. Reversal Logic
      if (tx.type === 'SELL' || tx.type === 'WITHDRAW_CACAO') {
        // Return grams to available balance
        const grams = tx.gramsAmount || tx.amount;
        await p.user.update({
          where: { id: tx.userId },
          data: {
            cacaoLocked: { decrement: grams },
            cacaoBalance: { increment: grams }
          }
        });
      }
    });

    res.json({ message: 'Transacción rechazada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DEPÓSITOS FÍSICOS (ADMIN/INSPECTOR) ─────────────────────────────────────
app.get('/admin/physical-deposits', adminMiddleware, async (req, res) => {
  try {
    const deposits = await prisma.physicalDeposit.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        center: true,
        inspector: { select: { id: true, email: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(deposits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/physical-deposits', adminMiddleware, async (req, res) => {
  try {
    const { userId, centerId, grossWeight, qualityGrade, moistureContent, fermentationGrade, impuritiesContent, notes } = req.body;

    // Validaciones básicas
    if (!userId || !centerId || !grossWeight || !qualityGrade) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Lógica de Factor de Conversión (Simplificada)
    // Premium: 1.0, Grado 1: 0.9, Grado 2: 0.7
    let conversionFactor = 0.7;
    if (qualityGrade === 'PREMIUM') conversionFactor = 1.0;
    else if (qualityGrade === 'GRADO_1') conversionFactor = 0.9;

    // Ajuste adicional por humedad e impurezas (si superan umbrales)
    // Supongamos: Humedad ideal 7%. Por cada punto arriba, restamos 1% del peso.
    let moisturePenalty = moistureContent > 7 ? (moistureContent - 7) / 100 : 0;
    let impuritiesPenalty = impuritiesContent / 100;

    const finalFactor = conversionFactor * (1 - moisturePenalty) * (1 - impuritiesPenalty);
    const finalTokens = parseFloat((grossWeight * finalFactor).toFixed(2));

    const deposit = await prisma.physicalDeposit.create({
      data: {
        userId: parseInt(userId),
        centerId: parseInt(centerId),
        inspectorId: req.userId,
        grossWeight: parseFloat(grossWeight),
        qualityGrade,
        moistureContent: parseFloat(moistureContent || 7),
        fermentationGrade: parseFloat(fermentationGrade || 0),
        impuritiesContent: parseFloat(impuritiesContent || 0),
        conversionFactor: finalFactor,
        finalTokensIssued: finalTokens,
        status: 'PENDING',
        notes: notes || null
      }
    });

    res.status(201).json(deposit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/admin/physical-deposits/:id/verify', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'COMPLETED' o 'REJECTED'

    if (!['COMPLETED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const deposit = await prisma.physicalDeposit.findUnique({
      where: { id: parseInt(id) },
      include: { user: true }
    });

    if (!deposit) return res.status(404).json({ error: 'Depósito no encontrado' });
    if (deposit.status !== 'PENDING') return res.status(400).json({ error: 'El depósito ya ha sido procesado' });

    if (status === 'REJECTED') {
      const updated = await prisma.physicalDeposit.update({
        where: { id: parseInt(id) },
        data: { status: 'REJECTED' }
      });
      return res.json(updated);
    }

    // Si es COMPLETED (Aprobado)
    const tokens = deposit.finalTokensIssued;
    const config = await getSystemConfig();

    // Transacción atómica
    const result = await prisma.$transaction([
      // 1. Marcar depósito como completado
      prisma.physicalDeposit.update({
        where: { id: parseInt(id) },
        data: { status: 'COMPLETED' }
      }),
      // 2. Incrementar saldo del usuario
      prisma.user.update({
        where: { id: deposit.userId },
        data: { cacaoBalance: { increment: tokens } }
      }),
      // 3. Crear registro de transacción
      prisma.transaction.create({
        data: {
          userId: deposit.userId,
          type: 'DEPOSIT_CACAO',
          amount: tokens,
          amountCacao: tokens,
          amountUSD: parseFloat((tokens * config.buyPrice).toFixed(2)),
          priceAt: config.buyPrice,
          status: 'COMPLETED',
          notes: `Tokenización de cacao físico (ID Depósito: ${id})`
        }
      }),
      // 4. Actualizar Reserva Global
      prisma.globalReserve.update({
        where: { id: 1 },
        data: {
          totalCacaoStock: { increment: deposit.grossWeight }, // Guardamos el peso bruto en stock físico? O el neto? 
          // Usualmente stock físico es lo que hay en bodega (bruto), tokensIssued es lo que se debe (neto/ajustado)
          tokensIssued: { increment: tokens }
        }
      }),
      // 5. Actualizar Stock del Centro de Acopio
      prisma.collectionCenter.update({
        where: { id: deposit.centerId },
        data: { currentStock: { increment: deposit.grossWeight } }
      })
    ]);

    res.json({ message: 'Depósito verificado y tokens emitidos', data: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Koawallet Backend corriendo en http://localhost:${PORT}`));