const fieldClass = (error) => `
  input
  ${error ? '!border-danger !bg-danger-bg/30' : ''}
`;

function Label({ children, htmlFor }) {
  if (!children) return null;
  return <label htmlFor={htmlFor} className="label">{children}</label>;
}

function Hint({ children }) {
  if (!children) return null;
  return <p className="text-[11px] text-faint mt-1">{children}</p>;
}

function ErrorText({ children }) {
  if (!children) return null;
  return <p className="text-[11px] text-danger mt-1">{children}</p>;
}

export function Input({ label, error, hint, icon: Icon, className = '', ...rest }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="relative">
        {Icon && <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />}
        <input className={`${fieldClass(error)} ${Icon ? '!pl-9' : ''}`} {...rest} />
      </div>
      {error ? <ErrorText>{error}</ErrorText> : <Hint>{hint}</Hint>}
    </div>
  );
}

export function Select({ label, error, hint, className = '', children, ...rest }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <select className={`select ${fieldClass(error)}`} {...rest}>
        {children}
      </select>
      {error ? <ErrorText>{error}</ErrorText> : <Hint>{hint}</Hint>}
    </div>
  );
}

export function TextArea({ label, error, hint, className = '', ...rest }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <textarea className={`textarea ${fieldClass(error)}`} {...rest} />
      {error ? <ErrorText>{error}</ErrorText> : <Hint>{hint}</Hint>}
    </div>
  );
}