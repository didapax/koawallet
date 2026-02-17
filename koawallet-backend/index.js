const express = require('express');
const cors = require('cors');
const prisma = require('./db'); // El archivo que creamos antes
const getCacaoPrice = require('./precioCacao');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/balance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });
    
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    res.json({
      fiat: user.fiatBalance,
      cacao: user.cacaoTokens
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para comprar Tokens de Cacao con Dinero Fiat
app.post('/buy-tokens', async (req, res) => {
  const { userId, amountFiat } = req.body;

  try {
    const currentPrice = await getCacaoPrice();
    if (!currentPrice) return res.status(500).json({ error: "No se pudo obtener el precio" });

    // Lógica: Tokens = Dinero Fiat / Precio Cacao
    const tokensToBuy = amountFiat / currentPrice;

    // Actualizamos al usuario en la BD (Transacción atómica)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fiatBalance: { decrement: amountFiat },
        cacaoTokens: { increment: tokensToBuy },
        transactions: {
          create: {
            type: "BUY",
            amount: tokensToBuy,
            priceAt: currentPrice
          }
        }
      }
    });

    res.json({ message: "Compra exitosa", balance: updatedUser.cacaoTokens });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Koawallet Backend corriendo en http://localhost:${PORT}`));