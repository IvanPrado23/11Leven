const express = require('express');
const makeController = require('../controllers/crudController');

module.exports = (resource) => {
  const router = express.Router();
  const controller = makeController(resource);
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  router.post('/', controller.create);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
};
