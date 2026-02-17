const axios = require('axios');
require('dotenv').config();

const getCacaoPrice = async () => {
  try {
    const response = await axios.get('https://zylalabs.com/api/api_code_here/commodities+api/price', {
      headers: {
        'Authorization': `Bearer ${process.env.ZILA_LABS_API_KEY}`
      },
      params: {
        symbol: 'COCOA' // Asegúrate de usar el símbolo correcto según la doc de Zyla
      }
    });

    // Supongamos que la API devuelve { "price": 4500.50 }
    return response.data.price; 
  } catch (error) {
    console.error("Error al obtener precio del cacao:", error.message);
    return null;
  }
};

module.exports = getCacaoPrice;