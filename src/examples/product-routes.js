// Another example file with different route patterns
// Using different syntax to test pattern matching

const routes = [
  {
    method: 'GET',
    path: '/api/products',
    handler: () => ({ products: [] })
  },
  {
    method: 'POST', 
    path: '/api/products',
    handler: () => ({ message: 'Product created' })
  },
  {
    method: 'GET',
    path: '/api/products/:id',
    handler: (req) => ({ product: req.params.id })
  },
  {
    method: 'PUT',
    path: '/api/products/:id', 
    handler: () => ({ message: 'Product updated' })
  },
  {
    method: 'DELETE',
    path: '/api/products/:id',
    handler: () => ({ message: 'Product deleted' })
  }
];

// Fastify-style route definitions
const fastifyRoutes = (fastify) => {
  fastify.get('/api/orders', async (request, reply) => {
    return { orders: [] };
  });
  
  fastify.post('/api/orders', async (request, reply) => {
    return { message: 'Order created' };
  });
  
  fastify.get('/api/orders/:id', async (request, reply) => {
    return { order: request.params.id };
  });
};

module.exports = { routes, fastifyRoutes };
