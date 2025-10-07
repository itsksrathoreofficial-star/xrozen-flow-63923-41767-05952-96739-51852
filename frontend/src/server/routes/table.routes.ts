/**
 * Table Routes
 */

import { Router } from 'express';
import { TableController } from '../controllers/table.controller';
import { validate } from '../middleware/validation.middleware';
import {
  createTableSchema,
  modifyTableSchema,
  insertRowSchema,
  updateRowSchema,
  getTableDataSchema,
  exportTableSchema,
} from '../validators/table.validator';

const router = Router();
const controller = new TableController();

router.get('/', controller.listTables);
router.get('/:name', controller.getTableSchema);
router.get('/:name/data', validate(getTableDataSchema, 'query'), controller.getTableData);
router.post('/', validate(createTableSchema), controller.createTable);
router.put('/:name', validate(modifyTableSchema), controller.modifyTable);
router.delete('/:name', controller.dropTable);
router.post('/:name/rows', validate(insertRowSchema), controller.insertRow);
router.put('/:name/rows/:id', validate(updateRowSchema), controller.updateRow);
router.delete('/:name/rows/:id', controller.deleteRow);
router.post('/:name/export', validate(exportTableSchema), controller.exportTable);

export default router;
