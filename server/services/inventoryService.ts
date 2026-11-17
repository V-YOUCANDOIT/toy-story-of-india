import { getDb } from '../database/connection.ts';
import { AppError } from '../middleware/errorHandler.ts';

export function deductStockForOrder(
  items: Array<{ product_id: number; quantity: number; name?: string }>,
  orderNumber: string,
  userId: number
): void {
  const db = getDb();
  const getProd = db.prepare('SELECT id, name, stock_quantity, is_available FROM products WHERE id = ?');
  const updateProd = db.prepare(
    `UPDATE products
     SET stock_quantity = stock_quantity - ?, updated_at = datetime('now')
     WHERE id = ? AND stock_quantity >= ?`
  );
  const insertLog = db.prepare(
    `INSERT INTO inventory_logs (product_id, change_amount, previous_stock, new_stock, reason, reference_id, created_by)
     VALUES (?, ?, ?, ?, 'order_placed', ?, ?)`
  );

  for (const item of items) {
    const prod = getProd.get(item.product_id) as
      | { id: number; name: string; stock_quantity: number; is_available: number }
      | undefined;

    if (!prod || prod.is_available !== 1) {
      throw new AppError(`Product "${item.name || item.product_id}" is currently unavailable.`, 400);
    }

    if (prod.stock_quantity < item.quantity) {
      throw new AppError(
        `Insufficient stock for "${prod.name}". Only ${prod.stock_quantity} remaining.`,
        400
      );
    }

    const res = updateProd.run(item.quantity, prod.id, item.quantity);
    if (res.changes === 0) {
      throw new AppError(`Insufficient stock for "${prod.name}".`, 400);
    }

    insertLog.run(
      prod.id,
      -item.quantity,
      prod.stock_quantity,
      prod.stock_quantity - item.quantity,
      orderNumber,
      userId
    );
  }
}

export function restoreStockForOrder(
  orderId: number,
  orderNumber: string,
  actorUserId: number
): void {
  const db = getDb();
  const orderItems = db
    .prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?')
    .all(orderId) as Array<{ product_id: number; quantity: number }>;

  const getProd = db.prepare('SELECT id, stock_quantity FROM products WHERE id = ?');
  const updateProd = db.prepare(
    `UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = datetime('now') WHERE id = ?`
  );
  const insertLog = db.prepare(
    `INSERT INTO inventory_logs (product_id, change_amount, previous_stock, new_stock, reason, reference_id, created_by)
     VALUES (?, ?, ?, ?, 'order_cancelled', ?, ?)`
  );

  for (const item of orderItems) {
    const prod = getProd.get(item.product_id) as { id: number; stock_quantity: number } | undefined;
    if (!prod) continue;
    updateProd.run(item.quantity, prod.id);
    insertLog.run(
      prod.id,
      item.quantity,
      prod.stock_quantity,
      prod.stock_quantity + item.quantity,
      orderNumber,
      actorUserId
    );
  }
}

export function adjustProductStock(
  productId: number,
  newStock: number,
  reason: string,
  adminUserId: number
): { previous_stock: number; new_stock: number } {
  const db = getDb();
  const prod = db
    .prepare('SELECT id, stock_quantity FROM products WHERE id = ?')
    .get(productId) as { id: number; stock_quantity: number } | undefined;

  if (!prod) {
    throw new AppError('Product not found', 404);
  }

  const diff = newStock - prod.stock_quantity;
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE products SET stock_quantity = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(newStock, productId);

    db.prepare(
      `INSERT INTO inventory_logs (product_id, change_amount, previous_stock, new_stock, reason, reference_id, created_by)
       VALUES (?, ?, ?, ?, ?, 'ADMIN', ?)`
    ).run(productId, diff, prod.stock_quantity, newStock, reason, adminUserId);
  });

  tx();
  return { previous_stock: prod.stock_quantity, new_stock: newStock };
}
