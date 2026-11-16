interface StatCountersProps {
  items: { value: number; label: string }[];
}

/** Big numbers over muted captions, split by thin rules. */
const StatCounters: React.FC<StatCountersProps> = ({ items }) => (
  <dl className="my-8 grid w-full grid-cols-1 gap-y-6 md:grid-cols-3 md:gap-y-0">
    {items.map(({ value, label }) => (
      <div
        key={label}
        className="flex flex-col-reverse items-center gap-y-2 border-t border-ui-muted/50 pt-6 first:border-t-0 first:pt-0 md:gap-y-4 md:border-t-0 md:border-l md:pt-0 md:first:border-l-0"
      >
        <dt className="text-center text-xl leading-6 font-medium text-ui-muted/60">
          {label}
        </dt>
        <dd className="text-4xl font-bold text-white">{value}</dd>
      </div>
    ))}
  </dl>
);

export default StatCounters;
