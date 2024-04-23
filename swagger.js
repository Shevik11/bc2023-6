// swagger-config.js

const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Your API',
        version: '1.0.0',
      },
    },
    apis: ['./server.js'], // Покажіть на свої файли з описом маршрутів
  };
  
  module.exports = swaggerOptions;
  
  