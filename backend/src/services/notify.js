import { Template, Notification, Outbox } from '../models/platformModels.js';

function render(body, context) {
  return String(body || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const value = path.split('.').reduce((cursor, key) => (cursor == null ? undefined : cursor[key]), context);
    return value == null ? '' : String(value);
  });
}

export async function notify(eventCode, recipient, context = {}) {
  const template = await Template.findOne({ code: eventCode, status: 'ACTIVE', deletedAt: null }).lean()
    || await Template.findOne({ kind: eventCode, status: 'ACTIVE', deletedAt: null }).lean();
  const title = render(template?.subject || eventCode, context);
  const body = render(template?.body || context.fallback || eventCode, context);
  if (recipient?.id) {
    await Notification.create({
      recipientType: recipient.type || 'CUSTOMER',
      recipientId: String(recipient.id),
      eventCode,
      title,
      body,
      href: context.href || '',
    });
  }
  const channel = template?.channel || 'SMS';
  if (channel !== 'IN_APP' && recipient?.address) {
    const row = await Outbox.create({
      channel,
      to: recipient.address,
      eventCode,
      body,
      status: 'QUEUED',
    });
    row.status = 'SENT';
    row.sentAt = new Date();
    await row.save();
  }
  return { title, body };
}

export async function notifyStaff(eventCode, permission, context) {
  const { User, Role } = await import('../modules/identity/model/User.js');
  const roles = await Role.find({ permissions: permission, status: 'ACTIVE', deletedAt: null }).select('_id').lean();
  const users = await User.find({ status: 'ACTIVE', deletedAt: null, 'roles.roleId': { $in: roles.map((role) => role._id) } }).lean();
  await Promise.all(users.map((user) => notify(eventCode, { id: user._id, type: 'STAFF', address: user.email || user.username }, context)));
}
