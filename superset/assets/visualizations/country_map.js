import d3 from 'd3';
import './country_map.css';
import { colorScalerFactory } from '../javascripts/modules/colors';
// import underscore


function countryMapChart(slice, payload) {
  // CONSTANTS
  const fd = payload.form_data;
  let path;
  let g;
  let bigText;
  let resultText;
  const container = slice.container;
  const data = payload.data;
  let format = d3.format(fd.number_format)

  // function for checking filter values
  function filterCheck(filter, value) {
    let checkVals = false
    fd.filters.forEach( (d) => {
      if ((d['col']==filter) & (d['val'][0]==value) ) {
        checkVals = true;
      }
    })
    return checkVals
  }

  // check values of filters
  let journey = filterCheck('comparison_metric','Journey time');
  let pct_change = filterCheck('difference type','Percentage change');
  let share = filterCheck('comparison_metric','Mode share');


  if (pct_change==true) {format = d3.format('.2%')}

  // creating the color maps
  const colorMap = {};
  if (fd.linear_color_scheme == 'positive_negative') {
    // note that the below order is important (not ideal)


    // define buffer
    let buffer = 0.5
    if (pct_change==true || share==true) {buffer = 0.005} // reduce buffer if for percentages

    // creating two different sets of data (positive and negative) needed for
    // creating color scales
    let data_n = [];
    let data_p = [];
    data.forEach((d) => {
      if (d.metric <= -1*buffer) {
        data_n.push(d)
      } else if (d.metric >= buffer) {
        data_p.push(d)
      }
    })
    // create the color scales
    let colorScalerRed= colorScalerFactory('neutral_red', data_n, v => v.metric);
    let colorScalerGreen = colorScalerFactory('neutral_green', data_p, v => v.metric);

    // swap the colours for journey times where decrease is good
    if (journey==true) {
      colorScalerRed = colorScalerFactory('neutral_green_opp', data_n, v => v.metric);
      colorScalerGreen = colorScalerFactory('neutral_red_opp', data_p, v => v.metric);
    }

    data.forEach((d) => {
      if (d.metric <= -1*buffer) {
        colorMap[d.country_id] = colorScalerRed(d.metric);
      } else if (d.metric >-1*buffer & d.metric <buffer){
        colorMap[d.country_id] = "#FBFBEF";
      } else {
        colorMap[d.country_id] = colorScalerGreen(d.metric);
      }
    })

  } else {
    const colorScaler = colorScalerFactory(fd.linear_color_scheme, data, v => v.metric);
    data.forEach((d) => {
      colorMap[d.country_id] = colorScaler(d.metric);
    })
  }
  const colorFn = d => colorMap[d.properties.ISO] || 'none';

  let centered;
  path = d3.geo.path();
  d3.select(slice.selector).selectAll('*').remove();
  const div = d3.select(slice.selector)
    .append('svg:svg')
    .attr('width', slice.width())
    .attr('height', slice.height())
    .attr('preserveAspectRatio', 'xMidYMid meet');

  container.css('height', slice.height());
  container.css('width', slice.width());

  const clicked = function (d) {
    let x;
    let y;
    let k;
    let bigTextX;
    let bigTextY;
    let bigTextSize;
    let resultTextX;
    let resultTextY;

    if (d && centered !== d) {
      const centroid = path.centroid(d);
      x = centroid[0];
      y = centroid[1];
      bigTextX = centroid[0];
      bigTextY = centroid[1] - 40;
      resultTextX = centroid[0];
      resultTextY = centroid[1] - 40;
      bigTextSize = '6px';
      k = 4;
      centered = d;
    } else {
      x = slice.width() / 2;
      y = slice.height() / 2;
      bigTextX = 0;
      bigTextY = 0;
      resultTextX = 0;
      resultTextY = 0;
      bigTextSize = '30px';
      k = 1;
      centered = null;
    }

    g.transition()
      .duration(750)
      .attr('transform', 'translate(' + slice.width() / 2 + ',' + slice.height() / 2 + ')scale(' + k + ')translate(' + -x + ',' + -y + ')');
    bigText.transition()
      .duration(750)
      .attr('transform', 'translate(0,0)translate(' + bigTextX + ',' + bigTextY + ')')
      .style('font-size', bigTextSize);
    resultText.transition()
      .duration(750)
      .attr('transform', 'translate(0,0)translate(' + resultTextX + ',' + resultTextY + ')');
  };

  const selectAndDisplayNameOfRegion = function (feature) {
    let name = '';
    if (feature && feature.properties) {
      if (feature.properties.ID_2) {
        name = feature.properties.NAME_2;
      } else {
        name = feature.properties.NAME_1;
      }
    }
    bigText.text(name);
  };

  const updateMetrics = function (region) {
    if (region.length > 0) {
      resultText.text(format(region[0].metric));
    }
  };

  const mouseenter = function (d) {
    // Darken color
    let c = colorFn(d);
    if (c !== 'none') {
      c = d3.rgb(c).darker().toString();
    }
    d3.select(this).style('fill', c);
    selectAndDisplayNameOfRegion(d);
    const result = data.filter(region => region.country_id === d.properties.ISO);
    updateMetrics(result);
  };

  const mouseout = function () {
    d3.select(this).style('fill', colorFn);
    bigText.text('');
    resultText.text('');
  };

  div.append('rect')
    .attr('class', 'background')
    .attr('width', slice.width())
    .attr('height', slice.height())
    .on('click', clicked);

  g = div.append('g');
  const mapLayer = g.append('g')
    .classed('map-layer', true);
  bigText = g.append('text')
    .classed('big-text', true)
    .attr('x', 20)
    .attr('y', 45);
  resultText = g.append('text')
    .classed('result-text', true)
    .attr('x', 20)
    .attr('y', 60);

  const url = `/static/assets/visualizations/countries/${fd.select_country.toLowerCase()}.geojson`;
  d3.json(url, function (error, mapData) {
    const features = mapData.features;
    const center = d3.geo.centroid(mapData);
    let scale = 150;
    let offset = [slice.width() / 2, slice.height() / 2];
    let projection = d3.geo.mercator().scale(scale).center(center)
      .translate(offset);

    path = path.projection(projection);

    const bounds = path.bounds(mapData);
    const hscale = scale * slice.width() / (bounds[1][0] - bounds[0][0]);
    const vscale = scale * slice.height() / (bounds[1][1] - bounds[0][1]);
    scale = (hscale < vscale) ? hscale : vscale;
    const offsetWidth = slice.width() - (bounds[0][0] + bounds[1][0]) / 2;
    const offsetHeigth = slice.height() - (bounds[0][1] + bounds[1][1]) / 2;
    offset = [offsetWidth, offsetHeigth];
    projection = d3.geo.mercator().center(center).scale(scale).translate(offset);
    path = path.projection(projection);

    // Draw each province as a path
    mapLayer.selectAll('path')
      .data(features)
      .enter().append('path')
      .attr('d', path)
      .attr('class', 'region')
      .attr('vector-effect', 'non-scaling-stroke')
      .style('fill', colorFn)
      .on('mouseenter', mouseenter)
      .on('mouseout', mouseout)
      .on('click', clicked);
  });
  container.show();
}

module.exports = countryMapChart;
