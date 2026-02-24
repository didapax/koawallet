const axios = require('axios');
require('dotenv').config();

const getCacaoPrice = async (manualMarketPrice = null) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = "gemini-2.5-flash"; // Modelo estable en 2026
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

    const marketPriceTon = manualMarketPrice || 0;

    const prompt = `Actúa como un Chief Financial Officer (CFO) experto en el mercado internacional de commodities (Cacao).
    Calcula los precios de COMPRA y VENTA para Koawallet basándote en:
    - Precio de Mercado Internacional ($P_{market}$): ${marketPriceTon} USD/Ton.
    - 1 Tonelada = 1,000,000 gramos.
    - Considera Spread de Operación, Almacenamiento y Merma por humedad.

    REGLA MANDATORIA: Devuelve ÚNICAMENTE un objeto JSON. NO incluyas introducciones, explicaciones, ni bloques de código markdown.

    ESTRUCTURA DE SALIDA ESPERADA:
    {
    "marketPriceTon": ${marketPriceTon},
    "buyPriceGram": 0.0,
    "sellPriceGram": 0.0
    }`;

    const response = await axios.post(url, {
      contents: [{
        parts: [{ text: prompt }]
      }]
    });

    let text = response.data.candidates[0].content.parts[0].text;

    // Limpiar posibles bloques de código markdown o prefijos conversacionales
    // Intentar extraer el primer objeto JSON encontrado { ... }
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No se encontró un objeto JSON válido en la respuesta de Gemini");
    }

    const jsonStr = jsonMatch[0].trim();
    const data = JSON.parse(jsonStr);

    return {
      marketPriceTon: data.marketPriceTon,
      buyPriceGram: data.buyPriceGram,
      sellPriceGram: data.sellPriceGram
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // Si 1.5-flash falla, intentamos con gemini-pro como fallback en v1
      console.log("gemini-1.5-flash no disponible en v1, reintentando con gemini-pro...");
      // Podríamos hacer un reintento aquí pero por ahora logueamos el error
    }
    console.error("Error al obtener precio del cacao vía Gemini (v1):", error.message);
    if (error.response) {
      console.error("Detalle del error:", JSON.stringify(error.response.data));
    }
    return null;
  }
};

module.exports = getCacaoPrice;