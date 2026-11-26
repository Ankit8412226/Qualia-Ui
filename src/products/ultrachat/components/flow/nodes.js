import { ChatText, GitBranch, Headset, Image as ImageIcon, Lightning, ListBullets, Question, Robot, SquaresFour, WebhooksLogo } from '@phosphor-icons/react';

/*
 * Flow node catalogue. Layout constants are shared by the node card and the edge router so
 * connectors meet the ports exactly without measuring the DOM.
 */

export const NODE_W = 220;
export const HEADER = 38;
export const SUMMARY = 52;
export const ROW = 30;

export const NODE_TYPES = {
  trigger: { label: 'Start', icon: Lightning, tone: 'brand', palette: false, help: 'Runs when a message matches the keywords.' },
  message: { label: 'Message', icon: ChatText, tone: 'info', help: 'Send a text message.', data: { text: '' } },
  buttons: { label: 'Buttons', icon: SquaresFour, tone: 'info', help: 'Up to 3 reply buttons. Each can lead somewhere else.', data: { text: '', options: ['Yes', 'No'] } },
  list: { label: 'List', icon: ListBullets, tone: 'info', help: 'A menu with up to 10 rows.', data: { text: '', button: 'View options', options: ['Option 1', 'Option 2', 'Option 3'] } },
  media: { label: 'Media', icon: ImageIcon, tone: 'violet', help: 'Send an image, video or PDF.', data: { media: '', caption: '' } },
  ask: { label: 'Ask question', icon: Question, tone: 'violet', help: 'Wait for an answer and save it.', data: { question: '', saveAs: '', validation: 'Text' } },
  condition: { label: 'Condition', icon: GitBranch, tone: 'warning', help: 'Branch on a saved answer.', data: { field: '', op: '=', value: '' } },
  crm: { label: 'CRM / Webhook', icon: WebhooksLogo, tone: 'accent', help: 'Create a lead or call your system.', data: { action: 'Create lead in Zoho CRM', url: '' } },
  ai: { label: 'AI bot', icon: Robot, tone: 'success', help: 'Let the AI bot answer from your documents.', data: { goal: '' } },
  handover: { label: 'Hand over to agent', icon: Headset, tone: 'danger', help: 'Assign the chat to a person. Ends the flow.', data: { team: 'Sales — Pune', note: '' } },
};

export const PALETTE = Object.entries(NODE_TYPES)
  .filter(([, t]) => t.palette !== false)
  .map(([type, t]) => ({ type, ...t }));

/** Output port labels for a node. Empty = no outputs. */
export function outputs(node) {
  switch (node.type) {
    case 'buttons':
    case 'list':
      return node.data.options?.length ? node.data.options : ['Option'];
    case 'condition':
      return ['Yes', 'No'];
    case 'handover':
      return [];
    case 'ask':
      return ['Answered'];
    default:
      return ['Next'];
  }
}

export const isMulti = (node) => ['buttons', 'list', 'condition'].includes(node.type);

export function nodeHeight(node) {
  const outs = outputs(node);
  return HEADER + SUMMARY + (isMulti(node) ? outs.length * ROW + 8 : 0);
}

/** Port positions in canvas coordinates. */
export function outPort(node, i) {
  const y = isMulti(node) ? HEADER + SUMMARY + ROW * i + ROW / 2 - 2 : HEADER + SUMMARY / 2;
  return { x: node.x + NODE_W, y: node.y + y };
}
export const inPort = (node) => ({ x: node.x, y: node.y + HEADER / 2 });

export function bezier(a, b) {
  const dx = Math.max(60, Math.abs(b.x - a.x) * 0.5);
  return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
}

export function summary(node) {
  const d = node.data;
  switch (node.type) {
    case 'trigger':
      return d.keywords ? `Keywords: ${d.keywords}` : 'Add trigger keywords';
    case 'message':
    case 'buttons':
    case 'list':
      return d.text || 'Write a message…';
    case 'media':
      return d.media ? `${d.media}${d.caption ? ` · ${d.caption}` : ''}` : 'Pick a file from the media library';
    case 'ask':
      return d.question ? `${d.question} → ${d.saveAs || '?'}` : 'Write a question…';
    case 'condition':
      return d.field ? `If ${d.field} ${d.op} ${d.value || '?'}` : 'Set a condition';
    case 'crm':
      return d.action + (d.url ? ` · ${d.url}` : '');
    case 'ai':
      return d.goal || 'Answer from the knowledge base';
    case 'handover':
      return `To ${d.team}${d.note ? ` · ${d.note}` : ''}`;
    default:
      return '';
  }
}

/** Problems that would stop the flow from publishing. [{nodeId, message}] */
export function validate(nodes, edges) {
  const issues = [];
  const trigger = nodes.find((n) => n.type === 'trigger');
  if (!trigger) issues.push({ nodeId: null, message: 'The flow has no start node.' });
  else if (!trigger.data.keywords?.trim()) issues.push({ nodeId: trigger.id, message: 'Start: add at least one trigger keyword.' });
  nodes.forEach((n) => {
    const label = NODE_TYPES[n.type].label;
    if (n.type !== 'trigger' && !edges.some((e) => e.to === n.id)) issues.push({ nodeId: n.id, message: `${label}: nothing leads to this step.` });
    outputs(n).forEach((o, i) => {
      if (!edges.some((e) => e.from === n.id && e.port === i) && n.type !== 'ai' && n.type !== 'crm' && n.type !== 'media' && n.type !== 'message')
        issues.push({ nodeId: n.id, message: `${label}: “${o}” isn’t connected to anything.` });
    });
    if (['message', 'buttons', 'list'].includes(n.type) && !n.data.text?.trim()) issues.push({ nodeId: n.id, message: `${label}: message text is empty.` });
    if (n.type === 'ask' && (!n.data.question || !n.data.saveAs)) issues.push({ nodeId: n.id, message: 'Ask question: add the question and where to save the answer.' });
    if (n.type === 'condition' && (!n.data.field || !n.data.value)) issues.push({ nodeId: n.id, message: 'Condition: choose a field and a value.' });
    if (n.type === 'media' && !n.data.media) issues.push({ nodeId: n.id, message: 'Media: pick a file.' });
    if (n.type === 'crm' && n.data.action === 'Call a webhook' && !/^https?:\/\//.test(n.data.url || '')) issues.push({ nodeId: n.id, message: 'Webhook: add a valid URL.' });
  });
  return issues;
}

export const TONE_CLASS = {
  brand: 'bg-brand/10 text-brand',
  info: 'bg-info/10 text-info',
  violet: 'bg-product-businesspulse/10 text-product-businesspulse',
  warning: 'bg-warning/15 text-warning',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
};
