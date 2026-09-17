// Derives the CSS class and display label for a job/invoice status badge
const STATUS_MAP = {
  'Received':             { cls: 'badge-received',         label: 'Received'           },
  'Diagnosis':            { cls: 'badge-diagnosis',        label: 'Diagnosis'          },
  'Waiting for Approval': { cls: 'badge-waiting-approval', label: 'Waiting Approval'   },
  'Approved':             { cls: 'badge-approved',         label: 'Approved'           },
  'Repairing':            { cls: 'badge-repairing',        label: 'Repairing'          },
  'Quality Check':        { cls: 'badge-quality',          label: 'Quality Check'      },
  'Ready for Pickup':     { cls: 'badge-pickup',           label: 'Ready for Pickup'   },
  'Completed':            { cls: 'badge-completed',        label: 'Completed'          },
  'Waiting for Parts':    { cls: 'badge-waiting-parts',    label: 'Waiting Parts'      },
  'Unrepairable':         { cls: 'badge-unrepairable',     label: 'Unrepairable'       },
  'Cancelled':            { cls: 'badge-cancelled',        label: 'Cancelled'          },
  // Invoice
  'Unpaid':               { cls: 'badge-unpaid',           label: 'Unpaid'             },
  'Paid':                 { cls: 'badge-paid',             label: 'Paid'               },
}

export default function StatusBadge({ status }) {
  const entry = STATUS_MAP[status] ?? { cls: 'badge-cancelled', label: status }
  return <span className={`badge ${entry.cls}`}>{entry.label}</span>
}

export { STATUS_MAP }
