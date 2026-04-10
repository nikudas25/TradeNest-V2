export function QuantityStepper({ value, onChange }) {
  return (
    <div className="quantity-stepper">
      <button onClick={() => onChange(Math.max(1, value - 1))} type="button">
        -
      </button>
      <span>{value}</span>
      <button onClick={() => onChange(value + 1)} type="button">
        +
      </button>
    </div>
  );
}

