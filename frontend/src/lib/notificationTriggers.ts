import { notificationService } from "./notifications";

/**
 * Notification triggers for various app events
 * Call these functions whenever the corresponding event occurs
 */

export const notificationTriggers = {
  /**
   * Trigger when a new project is created
   */
  async projectCreated(params: {
    editorId: string;
    clientId?: string;
    projectName: string;
    projectId: string;
  }) {
    // Notify the editor
    await notificationService.create({
      userId: params.editorId,
      type: 'project_created',
      title: 'New Project Created',
      message: `Project "${params.projectName}" has been created successfully.`,
      priority: 'info',
      link: `/project-details/${params.projectId}`,
      metadata: { projectId: params.projectId },
    });

    // Notify the client if assigned
    if (params.clientId) {
      await notificationService.create({
        userId: params.clientId,
        type: 'project_assigned',
        title: 'New Project Assigned',
        message: `You've been assigned to project "${params.projectName}".`,
        priority: 'important',
        link: `/project-details/${params.projectId}`,
        metadata: { projectId: params.projectId },
      });
    }
  },

  /**
   * Trigger when a project status changes
   */
  async projectStatusChanged(params: {
    projectId: string;
    projectName: string;
    oldStatus: string;
    newStatus: string;
    editorId: string;
    clientId?: string;
  }) {
    const userIds = [params.editorId];
    if (params.clientId) userIds.push(params.clientId);

    await notificationService.createBulk(userIds, {
      type: 'project_status_changed',
      title: 'Project Status Updated',
      message: `Project "${params.projectName}" status changed from ${params.oldStatus} to ${params.newStatus}.`,
      priority: 'info',
      link: `/project-details/${params.projectId}`,
      metadata: { projectId: params.projectId, oldStatus: params.oldStatus, newStatus: params.newStatus },
    });
  },

  /**
   * Trigger when a new version is added
   */
  async versionAdded(params: {
    projectId: string;
    projectName: string;
    versionNumber: number;
    uploaderId: string;
    clientId?: string;
  }) {
    // Notify client if exists
    if (params.clientId && params.clientId !== params.uploaderId) {
      await notificationService.create({
        userId: params.clientId,
        type: 'version_added',
        title: 'New Video Version Available',
        message: `Version ${params.versionNumber} has been added to "${params.projectName}".`,
        priority: 'important',
        link: `/project-details/${params.projectId}`,
        metadata: { projectId: params.projectId, versionNumber: params.versionNumber },
      });
    }
  },

  /**
   * Trigger when feedback is added
   */
  async feedbackAdded(params: {
    projectId: string;
    projectName: string;
    feedbackAuthorId: string;
    recipientId: string;
    feedbackContent: string;
  }) {
    if (params.feedbackAuthorId === params.recipientId) return;

    await notificationService.create({
      userId: params.recipientId,
      type: 'feedback_added',
      title: 'New Feedback Received',
      message: `New feedback on "${params.projectName}": ${params.feedbackContent.substring(0, 100)}...`,
      priority: 'important',
      link: `/project-details/${params.projectId}`,
      metadata: { projectId: params.projectId },
    });
  },

  /**
   * Trigger when corrections are requested
   */
  async correctionRequested(params: {
    projectId: string;
    projectName: string;
    editorId: string;
    clientId: string;
    correctionNotes: string;
  }) {
    await notificationService.create({
      userId: params.editorId,
      type: 'correction_requested',
      title: 'Corrections Requested',
      message: `Client requested corrections for "${params.projectName}".`,
      priority: 'important',
      link: `/project-details/${params.projectId}`,
      metadata: { projectId: params.projectId, notes: params.correctionNotes },
    });
  },

  /**
   * Trigger when project is approved
   */
  async projectApproved(params: {
    projectId: string;
    projectName: string;
    editorId: string;
    clientId: string;
  }) {
    await notificationService.create({
      userId: params.editorId,
      type: 'project_approved',
      title: 'Project Approved!',
      message: `Your project "${params.projectName}" has been approved by the client.`,
      priority: 'important',
      link: `/project-details/${params.projectId}`,
      metadata: { projectId: params.projectId },
    });
  },

  /**
   * Trigger when invoice is generated
   */
  async invoiceGenerated(params: {
    invoiceId: string;
    amount: number;
    recipientId: string;
    projectName?: string;
  }) {
    await notificationService.create({
      userId: params.recipientId,
      type: 'invoice_generated',
      title: 'New Invoice Generated',
      message: `An invoice for $${params.amount} has been generated${params.projectName ? ` for "${params.projectName}"` : ''}.`,
      priority: 'important',
      link: `/invoices`,
      metadata: { invoiceId: params.invoiceId, amount: params.amount },
    });
  },

  /**
   * Trigger when invoice is due soon
   */
  async invoiceDue(params: {
    invoiceId: string;
    amount: number;
    dueDate: string;
    recipientId: string;
  }) {
    await notificationService.create({
      userId: params.recipientId,
      type: 'invoice_due',
      title: 'Invoice Due Soon',
      message: `Invoice for $${params.amount} is due on ${new Date(params.dueDate).toLocaleDateString()}.`,
      priority: 'important',
      link: `/invoices`,
      metadata: { invoiceId: params.invoiceId },
      expiresInDays: 7,
    });
  },

  /**
   * Trigger when payment is received
   */
  async paymentReceived(params: {
    paymentId: string;
    amount: number;
    recipientId: string;
    projectName?: string;
  }) {
    await notificationService.create({
      userId: params.recipientId,
      type: 'payment_received',
      title: 'Payment Received',
      message: `Payment of $${params.amount} received${params.projectName ? ` for "${params.projectName}"` : ''}.`,
      priority: 'important',
      link: `/invoices`,
      metadata: { paymentId: params.paymentId, amount: params.amount },
    });
  },

  /**
   * Trigger when chat message is received
   */
  async chatMessage(params: {
    senderId: string;
    recipientId: string;
    senderName: string;
    messagePreview: string;
    projectId?: string;
  }) {
    if (params.senderId === params.recipientId) return;

    await notificationService.create({
      userId: params.recipientId,
      type: 'chat_message',
      title: 'New Message',
      message: `${params.senderName}: ${params.messagePreview.substring(0, 100)}...`,
      priority: 'info',
      link: params.projectId ? `/project-details/${params.projectId}` : '/chat',
      metadata: { senderId: params.senderId, projectId: params.projectId },
    });
  },

  /**
   * Trigger when deadline is approaching
   */
  async deadlineApproaching(params: {
    projectId: string;
    projectName: string;
    deadline: string;
    daysRemaining: number;
    userIds: string[];
  }) {
    const priority = params.daysRemaining === 1 ? 'critical' : params.daysRemaining <= 3 ? 'important' : 'info';

    await notificationService.createBulk(params.userIds, {
      type: 'deadline_approaching',
      title: 'Deadline Approaching',
      message: `Project "${params.projectName}" is due in ${params.daysRemaining} day${params.daysRemaining > 1 ? 's' : ''}.`,
      priority,
      link: `/project-details/${params.projectId}`,
      metadata: { projectId: params.projectId, deadline: params.deadline },
    });
  },

  /**
   * Trigger when deadline is overdue
   */
  async deadlineOverdue(params: {
    projectId: string;
    projectName: string;
    deadline: string;
    userIds: string[];
  }) {
    await notificationService.createBulk(params.userIds, {
      type: 'deadline_overdue',
      title: 'Deadline Overdue!',
      message: `Project "${params.projectName}" is now overdue.`,
      priority: 'critical',
      link: `/project-details/${params.projectId}`,
      metadata: { projectId: params.projectId, deadline: params.deadline },
    });
  },
};
