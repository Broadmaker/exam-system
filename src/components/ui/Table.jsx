import EmptyState from './EmptyState';

export default function Table({
  columns,
  data = [],
  keyField = 'id',
  emptyTitle,
  emptyBody,
  emptyAction,
  footer,
  onRowClick,
  className = '',
}) {
  const rowClickable = typeof onRowClick === 'function';

  return (
    <div className="table-wrap">
      {data.length === 0 ? (
        <EmptyState title={emptyTitle || 'No data'} body={emptyBody} action={emptyAction} compact />
      ) : (
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ textAlign: col.align || 'left', width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row[keyField] ?? i}
                onClick={rowClickable ? () => onRowClick(row) : undefined}
                className={rowClickable ? 'cursor-pointer' : ''}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                    {col.render ? col.render(row, i) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && <tfoot>{footer}</tfoot>}
        </table>
      )}
    </div>
  );
}