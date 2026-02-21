const axios = require('axios');
require('dotenv').config();

const getCacaoPrice = async () => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = "gemini-2.5-flash"; // Modelo estable en 2026
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `Actúa como un experto consultor de negocios internacional con especialidad en el mercado de commodities, específicamente el CACAO.
    Tu tarea es determinar el precio de referencia actual del cacao  y fijar los precios estratégicos para Koawallet.
    Extraer el precio actual del Cacao (Cocoa) usando como referencia la información de: https://github.com/didapax/koawallet/blob/main/cocoaprice.txt

    REGLAS DE CÁLCULO:
    1. "marketPriceTon": Es el precio actual de referencia del cacao por tonelada métrica en USD.
    2. "buyPriceGram": Es el precio al que Koawallet COMPRA el cacao a sus usuarios por cada gramo.
    3. "sellPriceGram": Es el precio al que Koawallet VENDE el cacao a sus usuarios por cada gramo.

    SALIDA REQUERIDA:
    Devuelve ÚNICAMENTE un objeto JSON con esta estructura, sin texto adicional, sin saltos de línea innecesarios y sin bloques de código Markdown:

    {
    "marketPriceTon": 0.0,
    "buyPriceGram": 0.0,
    "sellPriceGram": 0.0
    }`;

    const response = await axios.post(url, {
      contents: [{
        parts: [{ text: prompt }]
      }]
    });

    const text = response.data.candidates[0].content.parts[0].text;

    // Limpiar posibles bloques de código markdown
    const jsonStr = text.replace(/```json|```/g, "").trim();
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