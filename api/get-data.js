const fetch = require('node-fetch');

exports.handler = async function(event) {
  const address = encodeURIComponent(event.queryStringParameters.address);
  const rapidKey = process.env.RAPIDAPI_KEY;

  const propRes = await fetch(`https://zillow-com1.p.rapidapi.com/property?address=${address}`, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': rapidKey,
      'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com'
    }
  });
  const propData = await propRes.json();
  const { zpid, yearBuilt, lotAreaValue, livingArea } = propData;

  const compRes = await fetch(`https://zillow-com1.p.rapidapi.com/property_comps?zpid=${zpid}&count=25`, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': rapidKey,
      'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com'
    }
  });
  const compsData = await compRes.json();
  const comps = compsData.comparables || [];

  const filtered = comps.filter(c => {
    const priceSqft = c.price / c.livingArea;
    return (
      c.status === "Sold" &&
      c.daysOnZillow <= 365 &&
      Math.abs(c.bathrooms - propData.bathrooms) <= 1 &&
      Math.abs(c.bedrooms - propData.bedrooms) <= 1 &&
      Math.abs(c.livingArea - livingArea) / livingArea < 0.2 &&
      Math.abs(c.yearBuilt - yearBuilt) <= 10 &&
      priceSqft > 100
    );
  });

  const avgPPSF = filtered.reduce((sum, c) => sum + (c.price / c.livingArea), 0) / filtered.length;
  const arv = Math.round(avgPPSF * livingArea);

  return {
    statusCode: 200,
    body: JSON.stringify({
      sqft: livingArea,
      yearBuilt,
      arv
    })
  };
};
