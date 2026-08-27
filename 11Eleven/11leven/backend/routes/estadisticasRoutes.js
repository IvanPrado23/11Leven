const express = require('express');
const router = express.Router();
const estadisticasController = require('../controllers/estadisticasController');

router.get('/jugadores', estadisticasController.getJugadoresStats);
router.get('/equipos', estadisticasController.getEquiposStats);
router.get('/oficiales', estadisticasController.getOfficialStats);

module.exports = router;
