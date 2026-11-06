export function StatsBar() {
  const stats = [
    {
      label: 'Меньше неопределённости.',
      value: 'Больше движения к цели.',
      highlight: false,
    },
    {
      value: '10',
      label: 'профессий в каталоге',
      highlight: true,
    },
    {
      value: '3 минуты',
      label: 'до первого маршрута',
      highlight: true,
    },
    {
      value: 'Один план',
      label: 'вместо десятков вкладок',
      highlight: true,
    },
  ];

  return (
    <section className="bg-[#0F1729] text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6 sm:py-12">
        {stats.map((item, i) => (
          <div key={i} className={i === 0 ? 'col-span-2 sm:col-span-1' : ''}>
            {item.highlight ? (
              <>
                <p className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {item.value}
                </p>
                <p className="mt-1 text-sm text-white/60">{item.label}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-white/90">{item.label}</p>
                <p className="mt-1 text-sm text-white/60">{item.value}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
