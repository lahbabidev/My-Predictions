"use client";

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { HorseAnalysisMetrics } from '@/lib/analyticalEngine';
import { PMURace } from '@/types/pmu';
import { CloudRain, Sun, Gauge, Navigation } from 'lucide-react';

interface SpeedConditionComparisonD3Props {
  metrics: HorseAnalysisMetrics[];
  raceInfo: PMURace;
}

export default function SpeedConditionComparisonD3({ metrics, raceInfo }: SpeedConditionComparisonD3Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Take top 8 horses based on ensemble probability to keep chart readable
  const topHorses = [...metrics].sort((a, b) => b.ensembleProb - a.ensembleProb).slice(0, 8);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    const width = 800;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "auto");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define scales
    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, Math.max(100, d3.max(topHorses, d => d.classPowerIndex) || 100)])
      .range([innerHeight, 0]);

    const rScale = d3.scaleSqrt()
      .domain([0, d3.max(topHorses, d => d.ensembleProb) || 1])
      .range([4, 24]);

    const colorScale = (d: HorseAnalysisMetrics) => {
      if (d.smartMoneySignal === "STRONG_BUY") return "#10b981"; 
      if (d.smartMoneySignal === "DRIFTING") return "#ef4444"; 
      return "#6366f1"; 
    };

    const yAxisGrid = d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(() => "").ticks(5);
    g.append("g")
      .attr("class", "grid-lines opacity-10")
      .call(yAxisGrid)
      .selectAll("line")
      .attr("stroke", "#9ca3af");

    const xAxisGrid = d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat(() => "").ticks(5);
    g.append("g")
      .attr("class", "grid-lines opacity-10")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxisGrid)
      .selectAll("line")
      .attr("stroke", "#9ca3af");

    g.selectAll(".domain").remove();

    const xAxis = d3.axisBottom(xScale).ticks(5);
    const yAxis = d3.axisLeft(yScale).ticks(5);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr("color", "#6b7280")
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .attr("font-family", "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace")
      .selectAll(".domain").attr("stroke", "#e5e7eb");

    g.append("g")
      .call(yAxis)
      .attr("color", "#6b7280")
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .attr("font-family", "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace")
      .selectAll(".domain").attr("stroke", "#e5e7eb");

    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 40)
      .attr("text-anchor", "middle")
      .attr("fill", "#4b5563")
      .attr("font-weight", "600")
      .attr("font-size", "14px")
      .text("ملاءمة المسافة والظروف (%)");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -40)
      .attr("text-anchor", "middle")
      .attr("fill", "#4b5563")
      .attr("font-weight", "600")
      .attr("font-size", "14px")
      .text("مؤشر القوة والسرعة");

    const tooltip = d3.select("body").append("div")
      .attr("class", "d3-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(17, 24, 39, 0.95)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "8px")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("box-shadow", "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)")
      .style("transform", "translate(-50%, -100%)")
      .style("margin-top", "-10px")
      .style("z-index", 100);

    const nodes = g.selectAll(".node")
      .data(topHorses)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${xScale(d.distanceSuitability || 50)},${yScale(d.classPowerIndex)})`);

    const defs = svg.append("defs");
    const filter = defs.append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    
    filter.append("feGaussianBlur")
      .attr("stdDeviation", "4")
      .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    nodes.append("circle")
      .attr("r", 0)
      .attr("fill", d => colorScale(d))
      .attr("opacity", 0.8)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("filter", "url(#glow)")
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", rScale(d.ensembleProb) * 1.2)
          .attr("opacity", 1);
        
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.text(`
          <div class="flex flex-col gap-1 text-right" dir="rtl">
            <div class="font-bold text-sm border-b border-gray-700 pb-1 mb-1">
              #${d.numPmu} ${d.nom}
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-gray-400">القوة:</span>
              <span class="font-mono text-indigo-300">${d.classPowerIndex.toFixed(1)}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-gray-400">ملاءمة الظروف:</span>
              <span class="font-mono text-emerald-300">${(d.distanceSuitability || 50).toFixed(0)}%</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-gray-400">أفضل توقيت:</span>
              <span class="font-mono text-yellow-300">${d.speedRatingKm}</span>
            </div>
          </div>
        `)
        .style("left", (event.pageX) + "px")
        .style("top", (event.pageY) + "px");
      })
      .on("mousemove", function (event) {
        tooltip.style("left", (event.pageX) + "px").style("top", (event.pageY) + "px");
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", rScale(d.ensembleProb))
          .attr("opacity", 0.8);
        
        tooltip.transition().duration(500).style("opacity", 0);
      })
      .transition()
      .duration(1000)
      .delay((d, i) => i * 100)
      .attr("r", d => rScale(d.ensembleProb));

    nodes.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#fff")
      .attr("font-size", d => Math.max(10, rScale(d.ensembleProb) * 0.8) + "px")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")
      .text(d => d.numPmu)
      .style("opacity", 0)
      .transition()
      .duration(1000)
      .delay((d, i) => i * 100 + 500)
      .style("opacity", 1);

    return () => {
      d3.selectAll(".d3-tooltip").remove();
    };
  }, [topHorses]);

  return (
    <div className="bg-white rounded-2xl p-6 border shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-indigo-500" />
            تحليل السرعة وظروف المضمار (D3 Scatter Plot)
          </h3>
          <p className="text-sm text-neutral-500 mt-1">
            مقارنة بين قوة الحصان الشاملة (Y) ومدى ملاءمة مسافة وظروف السباق (X). حجم الدائرة يعكس الاحتمالية الإجمالية للفوز.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium text-neutral-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span>دعم مالي (Smart Money)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
            <span>طبيعي</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>تراجع الدعم (Drifting)</span>
          </div>
        </div>
      </div>
      
      <div className="w-full overflow-hidden bg-neutral-50 rounded-xl border border-neutral-100">
        <svg ref={svgRef} className="w-full h-full min-h-[400px]"></svg>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {topHorses.slice(0, 3).map((horse, idx) => (
          <div key={horse.numPmu} className="bg-neutral-50 p-3 rounded-xl border flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="font-black text-neutral-900 text-sm">#{horse.numPmu} {horse.nom}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                أفضل {idx + 1}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex flex-col">
                <span className="text-neutral-400">توقيت</span>
                <span className="font-bold text-neutral-700">{horse.speedRatingKm}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-400">ملاءمة</span>
                <span className="font-bold text-emerald-600">{Math.round(horse.distanceSuitability || 50)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
