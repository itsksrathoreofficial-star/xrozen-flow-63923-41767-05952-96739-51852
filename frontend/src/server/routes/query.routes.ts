/**
 * Query Routes
 */

import { Router } from 'express';
import { QueryController } from '../controllers/query.controller';
import { validate } from '../middleware/validation.middleware';
import {
  executeQuerySchema,
  saveQuerySchema,
  explainQuerySchema,
} from '../validators/query.validator';
import { queryExecutionLimiter } from '../middleware/rate-limit.middleware';

const router = Router();
const controller = new QueryController();

router.post('/execute', queryExecutionLimiter, validate(executeQuerySchema), controller.executeQuery);
router.get('/history', controller.getQueryHistory);
router.post('/explain', validate(explainQuerySchema), controller.explainQuery);
router.post('/save', validate(saveQuerySchema), controller.saveQuery);
router.get('/saved', controller.getSavedQueries);
router.delete('/saved/:id', controller.deleteSavedQuery);

export default router;
