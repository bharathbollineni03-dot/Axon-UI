import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CrosshairCursor } from '../components/CrosshairCursor/CrosshairCursor';
import { XAxis, YAxis } from '../components/Axis/Axis';
import { xScaleTicks, yScaleTicks } from '../components/Axis/ticks';
import { Legend } from '../components/Legend/Legend';
import { ResponsiveContainer } from '../components/ResponsiveContainer/ResponsiveContainer';
import { Tooltip, TooltipContent } from '../components/Tooltip/Tooltip';
import { chartColor } from '../internal/palette';
import { computeDomain, createXScale, createYScale, nearestIndex } from '../internal/scales';
import { monthlyFinance } from './data';

const meta: Meta = {
  title: 'Charts/Building blocks',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A chart is a few small parts. This story builds a lollipop chart from them: ' +
          '`ResponsiveContainer` for the width, `createXScale` and `createYScale` for the math, ' +
          '`XAxis` and `YAxis` with ticks from `xScaleTicks` and `yScaleTicks`, `CrosshairCursor`, ' +
          '`Tooltip` and `Legend`. Use the ready-made charts unless you need a shape they do not have.',
      },
    },
  },
};
export default meta;
type Story = StoryObj;

const margin = { top: 12, right: 16, bottom: 28, left: 44 };

function Lollipop() {
  const [active, setActive] = useState<number | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [showProfit, setShowProfit] = useState(true);

  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)' }}>
      <Legend
        items={[{ key: 'profit', name: 'Profit', color: chartColor(2), hidden: !showProfit }]}
        onToggle={() => setShowProfit((value) => !value)}
      />
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer height={260}>
          {({ width, height }) => {
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;
            const x = createXScale({
              values: monthlyFinance.map((row) => row.month),
              kind: 'point',
              range: [0, innerWidth],
            });
            const values = showProfit ? monthlyFinance.map((row) => row.profit) : [];
            const y = createYScale({
              domain: computeDomain(values, { includeZero: true }),
              range: [innerHeight, 0],
            });
            const positions = monthlyFinance.map((row) => x.position(row.month));
            return (
              <>
                <svg
                  width={width}
                  height={height}
                  role="img"
                  aria-label="Profit by month, as lollipops"
                >
                  <g transform={`translate(${margin.left}, ${margin.top})`}>
                    <YAxis
                      ticks={yScaleTicks(y, { count: 5 })}
                      range={[innerHeight, 0]}
                      gridLength={innerWidth}
                    />
                    <XAxis ticks={xScaleTicks(x)} range={[0, innerWidth]} y={innerHeight} />
                    {active !== null ? (
                      <CrosshairCursor position={positions[active]!} length={innerHeight} />
                    ) : null}
                    {showProfit
                      ? monthlyFinance.map((row, index) => (
                          <g key={row.month}>
                            <line
                              x1={positions[index]}
                              x2={positions[index]}
                              y1={y.baseline}
                              y2={y.position(row.profit)}
                              stroke={chartColor(2)}
                              strokeWidth={2}
                            />
                            <circle
                              cx={positions[index]}
                              cy={y.position(row.profit)}
                              r={5}
                              fill={chartColor(2)}
                            />
                          </g>
                        ))
                      : null}
                    <rect
                      width={innerWidth}
                      height={innerHeight}
                      fill="transparent"
                      onPointerMove={(event) => {
                        const box = event.currentTarget.getBoundingClientRect();
                        setActive(nearestIndex(positions, event.clientX - box.left));
                        setPointer({
                          x: event.clientX - box.left + margin.left,
                          y: event.clientY - box.top + margin.top,
                        });
                      }}
                      onPointerLeave={() => setActive(null)}
                    />
                  </g>
                </svg>
                {active !== null && showProfit ? (
                  <Tooltip
                    x={pointer.x}
                    y={pointer.y}
                    containerWidth={width}
                    containerHeight={height}
                  >
                    <TooltipContent
                      title={monthlyFinance[active]!.month}
                      rows={[
                        {
                          key: 'profit',
                          name: 'Profit',
                          color: chartColor(2),
                          value: `$${monthlyFinance[active]!.profit}k`,
                        },
                      ]}
                    />
                  </Tooltip>
                ) : null}
              </>
            );
          }}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export const BuildYourOwn: Story = {
  name: 'A lollipop chart from the parts',
  render: () => <Lollipop />,
};
