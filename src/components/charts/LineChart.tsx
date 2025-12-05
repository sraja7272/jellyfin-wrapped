import { useEffect, useRef } from "react";
import * as d3 from "d3";

type LineChartData = { x: number; y: number; label?: string };

export function LineChart({
  data,
  width,
  height,
  xLabel,
  yLabel,
  lineColor,
  areaColor,
}: {
  data: LineChartData[];
  width: number;
  height: number;
  xLabel: string;
  yLabel: string;
  lineColor: string;
  areaColor: string;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;

    // Use point scale if we have labels, otherwise linear
    const hasLabels = data.some((d) => d.label);
    
    // Increase bottom margin when labels are present to accommodate rotated labels
    const margin = { 
      top: 20, 
      right: 30, 
      bottom: hasLabels ? 100 : 60, // More space for rotated labels and x-axis label
      left: 50 
    };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    d3.select(ref.current).selectAll("*").remove();

    const svg = d3
      .select(ref.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = hasLabels
      ? d3
          .scalePoint()
          .domain(data.map((d, i) => d.label ?? i.toString()))
          .range([0, innerWidth])
      : d3
          .scaleLinear()
          .domain([0, d3.max(data, (d: LineChartData) => d.x) ?? 0])
          .range([0, innerWidth]);

    const maxY = d3.max(data, (d: LineChartData) => d.y) ?? 0;
    // Round up to nearest multiple of 5 for the domain
    const roundedMax = Math.ceil(maxY / 5) * 5;
    
    const y = d3
      .scaleLinear()
      .domain([0, roundedMax])
      .range([innerHeight, 0]);

    const line = d3
      .line<LineChartData>()
      .x((d: LineChartData) => {
        if (hasLabels) {
          return (x as d3.ScalePoint<string>)(d.label ?? d.x.toString()) ?? 0;
        }
        return (x as d3.ScaleLinear<number, number>)(d.x);
      })
      .y((d: LineChartData) => y(d.y));

    const area = d3
      .area<LineChartData>()
      .x((d: LineChartData) => {
        if (hasLabels) {
          return (x as d3.ScalePoint<string>)(d.label ?? d.x.toString()) ?? 0;
        }
        return (x as d3.ScaleLinear<number, number>)(d.x);
      })
      .y0(innerHeight)
      .y1((d: LineChartData) => y(d.y));

    svg.append("path").datum(data).attr("fill", areaColor).attr("d", area);

    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", lineColor)
      .attr("stroke-width", 2)
      .attr("d", line);

    const xAxis = hasLabels
      ? d3.axisBottom(x as d3.ScalePoint<string>).tickFormat((d) => {
          // Format month labels (e.g., "2024-01" -> "Jan 2024")
          if (typeof d === "string" && d.match(/^\d{4}-\d{2}$/)) {
            // Parse year and month explicitly to avoid timezone issues
            const [year, month] = d.split("-").map(Number);
            const date = new Date(year, month - 1, 1); // month is 0-indexed in JS Date
            return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
          }
          return d;
        })
      : d3.axisBottom(x as d3.ScaleLinear<number, number>);

    svg
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)")
      .style("fill", "#94a3b8")
      .style("font-size", "12px");

    svg
      .append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + (hasLabels ? 80 : 40))
      .attr("fill", "currentColor")
      .style("text-anchor", "middle")
      .style("fill", "#94a3b8")
      .style("font-size", "14px")
      .text(xLabel);

    const yAxis = d3.axisLeft(y)
      .ticks(Math.ceil(roundedMax / 5)) // Generate ticks at multiples of 5
      .tickFormat((d) => {
        const value = typeof d === "number" ? d : Number(d);
        // Only show values that are multiples of 5
        if (value % 5 === 0) {
          // Format as hours with 1 decimal place if less than 10, otherwise whole number
          if (value < 10) {
            return value.toFixed(1);
          }
          return Math.round(value).toString();
        }
        return ""; // Don't show non-multiples of 5
      });
    
    const yAxisGroup = svg.append("g").call(yAxis);
    
    // Style y-axis text and ticks for better visibility
    yAxisGroup
      .selectAll("text")
      .style("fill", "#e2e8f0")
      .style("font-size", "12px");
    
    yAxisGroup
      .selectAll("line, path")
      .style("stroke", "#475569");
    
    yAxisGroup
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -innerHeight / 2)
      .attr("fill", "#94a3b8")
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .text(yLabel);
  }, [data, width, height, xLabel, yLabel, lineColor, areaColor]);

  return <svg ref={ref} />;
}
