import { Router } from 'express';
import { body, param } from 'express-validator';
import { chatController } from '../controllers/chat.controller.js';
import { authenticate, validate } from '../middlewares/index.js';

const router = Router();

// Validation schemas
const sendMessageValidation = [
  param('conversationId').isUUID().withMessage('Valid conversation ID is required'),
  body('content').isString().isLength({ min: 1, max: 2000 }).withMessage('Message content is required (max 2000 chars)'),
  body('type')
    .optional()
    .isIn(['TEXT', 'IMAGE', 'GARMENT_OFFER', 'LOCATION'])
    .withMessage('Invalid message type'),
  body('metadata').optional().isObject(),
];

const conversationIdValidation = [
  param('conversationId').isUUID().withMessage('Valid conversation ID is required'),
];

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/unread-count', chatController.getUnreadCount.bind(chatController));

router.get('/', chatController.getConversations.bind(chatController));

router.get(
  '/:conversationId/messages',
  validate(conversationIdValidation),
  chatController.getMessages.bind(chatController)
);

router.post(
  '/:conversationId/messages',
  validate(sendMessageValidation),
  chatController.sendMessage.bind(chatController)
);

router.post(
  '/:conversationId/read',
  validate(conversationIdValidation),
  chatController.markAsRead.bind(chatController)
);

export default router;
