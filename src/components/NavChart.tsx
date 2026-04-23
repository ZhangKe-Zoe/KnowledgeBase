import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent, TooltipComponent, DataZoomComponent, LegendComponent, TitleComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, LegendComponent, TitleComponent, CanvasRenderer]);

interface Props {
  dates: string[];
  series: Array<{ name: string; data: number[] }>;
  height?: number;
  yLabel?: string;
}

export function NavChart({ dates, series, height = 260, yLabel }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, 'dark');
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { textStyle: { color: '#cbd5e1' } },
      grid: { left: 40, right: 10, top: 30, bottom: 50 },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        scale: true,
        name: yLabel,
        nameTextStyle: { color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      dataZoom: [
        { type: 'inside', start: 70, end: 100 },
        { type: 'slider', start: 70, end: 100, height: 20, bottom: 10, textStyle: { color: '#94a3b8' } },
      ],
      series: series.map((s) => ({
        name: s.name,
        type: 'line',
        data: s.data,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.5 },
      })),
    });
    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      chart.dispose();
    };
  }, [dates, series, yLabel]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}
