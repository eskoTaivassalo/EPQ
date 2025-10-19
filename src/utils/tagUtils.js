// Apufunktiot tag-järjestelmälle

export const calculatePriceRange = (hourlyRate) => {
  const rate = parseFloat(hourlyRate);
  
  if (isNaN(rate)) return null;
  
  if (rate <= 20) return 'budget';
  if (rate <= 35) return 'standard';
  if (rate <= 50) return 'premium';
  return 'luxury';
};

export const formatPrice = (price) => {
  const numPrice = parseFloat(price);
  return isNaN(numPrice) ? price : `€${numPrice}`;
};

export const formatPriceRange = (priceRange) => {
  const ranges = {
    budget: '€10-20',
    standard: '€20-35',
    premium: '€35-50',
    luxury: '€50+'
  };
  return ranges[priceRange] || priceRange;
};