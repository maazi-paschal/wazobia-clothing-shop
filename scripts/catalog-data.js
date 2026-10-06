/* Wazobia catalog (36 pieces). Fallback data for the storefront AND source for supabase/seed.sql
   (run `node scripts/generate-seed.js` to regenerate the SQL after editing). */
(function () {
  const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;
  const IMG = [
    "1515886657613-9f3515b0c78f","1596755094514-f87e34085b2c","1624378439575-d8705ad7ae80","1521572163474-6864f9cf17ab",
    "1572804013309-59a88b7e92f1","1591369822096-ffd140ec948f","1551028719-00167b16eac5","1583496661160-fb5886a13d77",
    "1509631179647-0177331693ae","1507003211169-0a1dd7228f2d","1487222477894-8943e31ef7b2","1544441893-675973e31985",
    "1485968579580-b6d095142e6e","1503342217505-b0a15ec3261c","1529139574466-a303027c1d8b","1553062407-98eeb64c6a62",
    "1552374196-1ab2a1c593e8","1556905055-8f358a7a47b2","1516762689617-e1cffcef479d","1617137968427-85924c800a22",
    "1496747611176-843222e1e57c","1441984904996-e0b6ba687e04","1618354691373-d851c5c3a990","1483985988355-763728e1935b",
    "1608231387042-66d1773070a5","1520975916090-3105956dac38","1542291026-7eec264c27ff","1507679799987-c73779587ccf",
    "1591047139829-d91aecb6caea","1434389677669-e08b4cac3105","1548036328-c9fa89d128fa","1584917865442-de89df76afd3",
    "1558769132-cb1aea458c5e","1539109136881-3be0616acf4b","1543163521-1bf539c55dd2","1566174053879-31528523f8ae",
  ];
  const ALL = ["S", "M", "L", "XL", "XXL"], SML = ["S", "M", "L"], ONE = ["One Size"];
  // [name, category, price, tag, rating, reviews, sizes, description]
  const rows = [
    // Men
    ["Adire Graphic Tee", "Men", 58, "BESTSELLER", 4.9, 128, ALL, "Heavyweight organic cotton tee with a hand-printed Adire motif."],
    ["Sahara Graphic Tee", "Men", 54, null, 4.6, 71, ALL, "Boxy terracotta tee with a quiet back print."],
    ["Linen Kimono Shirt", "Men", 112, "NEW", 4.8, 46, ALL, "Open-weave linen kimono shirt with a relaxed, drapey fit."],
    ["Ankara Bomber Jacket", "Men", 218, "LIMITED", 4.9, 39, ALL, "Quilted bomber finished in a limited Ankara print."],
    ["Corduroy Overshirt", "Men", 134, null, 4.7, 88, ALL, "Mid-wale corduroy overshirt in warm sand."],
    ["Tailored Wool Trousers", "Men", 156, "BESTSELLER", 4.8, 102, ALL, "Pleated wool-blend trousers with a clean, tapered leg."],
    ["Safari Jacket", "Men", 189, null, 4.6, 54, ALL, "Four-pocket cotton-twill safari jacket with a belted waist."],
    ["Agbada Kaftan", "Men", 142, "NEW", 4.8, 33, ALL, "Lightweight cotton kaftan with minimal embroidered neckline."],
    ["Utility Cargo Pants", "Men", 118, null, 4.5, 77, ALL, "Relaxed cargo pants cut from washed cotton canvas."],
    ["Heavyweight Hoodie", "Men", 98, "BESTSELLER", 4.9, 214, ALL, "480gsm brushed-back fleece hoodie in earthy charcoal."],
    ["Indigo Adire Shirt", "Men", 96, null, 4.4, 29, ALL, "Short-sleeve camp shirt in hand-dyed indigo Adire."],
    ["Pleated Linen Shorts", "Men", 74, "NEW", 4.5, 41, ALL, "Easy pleated shorts in breathable stone linen."],
    // Women
    ["Structured Midi Dress", "Women", 176, "BESTSELLER", 4.9, 156, ALL, "Sculpted midi dress with a defined waist and cap sleeve."],
    ["Silk Wrap Top", "Women", 108, null, 4.7, 63, ALL, "Fluid silk wrap top with a self-tie closure."],
    ["Pleated Palazzo Pants", "Women", 124, null, 4.8, 92, ALL, "High-waisted palazzo pants with knife pleats."],
    ["Belted Trench Coat", "Women", 248, "LIMITED", 4.9, 58, ALL, "Water-resistant cotton trench with storm flap detailing."],
    ["Cropped Linen Blazer", "Women", 164, "NEW", 4.7, 47, ALL, "Boxy cropped blazer in structured Belgian linen."],
    ["Halter Maxi Dress", "Women", 168, null, 4.8, 84, ALL, "Backless halter maxi in a fluid crepe."],
    ["Asymmetric Tunic", "Women", 118, null, 4.5, 36, ALL, "Asymmetric-hem tunic with a sculptural collar."],
    ["Wide-Leg Jumpsuit", "Women", 192, "BESTSELLER", 4.8, 119, ALL, "One-piece wide-leg jumpsuit with an adjustable belt."],
    ["Ribbed Knit Skirt", "Women", 88, null, 4.6, 70, ALL, "Stretch ribbed midi skirt that hugs and moves."],
    ["Ankara Wrap Dress", "Women", 164, "NEW", 4.9, 52, ALL, "Geometric Ankara print wrap dress with a flowing hem."],
    ["Satin Slip Skirt", "Women", 92, null, 4.4, 45, ALL, "Bias-cut satin slip skirt in warm champagne."],
    ["Linen Shirt Dress", "Women", 138, null, 4.6, 61, ALL, "Relaxed linen shirt dress with a drop shoulder."],
    // Accessories & Unisex
    ["Leather Crossbody Bag", "Accessories", 168, "BESTSELLER", 4.9, 173, ONE, "Vegetable-tanned leather crossbody with brass hardware."],
    ["Woven Bucket Hat", "Accessories", 52, null, 4.5, 38, SML, "Hand-woven raffia bucket hat."],
    ["Minimalist Wool Scarf", "Accessories", 78, "NEW", 4.7, 49, ONE, "Oversized merino scarf in a tonal weave."],
    ["Canvas Weekend Tote", "Accessories", 86, null, 4.8, 96, ONE, "Heavy canvas tote with leather handles."],
    ["Beaded Bracelet Set", "Accessories", 46, "LIMITED", 4.8, 64, ONE, "Hand-beaded stacking bracelets, set of three."],
    ["Suede Chelsea Boots", "Accessories", 228, "BESTSELLER", 4.9, 141, ALL, "Italian suede Chelsea boots with a stacked sole."],
    ["Leather Belt", "Accessories", 64, null, 4.6, 52, SML, "Full-grain leather belt with a solid brass buckle."],
    ["Raffia Sun Hat", "Accessories", 58, null, 4.4, 31, SML, "Wide-brim raffia hat for sun-drenched days."],
    ["Brass Cuff", "Accessories", 68, "NEW", 4.7, 27, ONE, "Hand-hammered brass cuff with a matte finish."],
    ["Silk Headwrap", "Accessories", 48, null, 4.6, 44, ONE, "Printed silk headwrap that doubles as a scarf."],
    ["Leather Card Holder", "Accessories", 42, null, 4.7, 83, ONE, "Slim leather card holder in cognac."],
    ["Woven Market Basket", "Accessories", 72, null, 4.5, 35, ONE, "Hand-woven market basket with leather straps."],
  ];
  const SEED = rows.map((r, i) => ({
    id: "wz-" + String(i + 1).padStart(3, "0"),
    name: r[0], category: r[1], price: r[2], tag: r[3], rating: r[4], reviews: r[5],
    sizes: r[6], description: r[7], image_url: U(IMG[i]),
  }));
  if (typeof module !== "undefined" && module.exports) module.exports = SEED;
  else window.SEED = SEED;
})();
