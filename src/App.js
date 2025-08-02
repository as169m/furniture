import React, { useState, useEffect } from "react";
import {
  Ruler,
  LayoutDashboard,
  Box,
  DollarSign,
  Hammer,
  Percent,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Palette,
  GlassWater,
  Table,
  Sofa,
  Settings,
} from "lucide-react";

// Define DEFAULT constants for material costs, hardware, and labor rates (BASE CURRENCY: USD)
// These will be the initial values for the customizable costs.
const DEFAULT_MATERIAL_COSTS_PER_SQFT = {
  plywood_18mm: 5.0,
  plywood_12mm: 3.5,
  plywood_6mm: 2.0,
  mdf_18mm: 3.0,
  mdf_12mm: 2.0,
  mdf_6mm: 1.5,
  solid_wood_18mm: 10.0,
  solid_wood_12mm: 7.0,
  solid_wood_6mm: 4.0,
};

const DEFAULT_EDGE_BANDING_COST_PER_LINEAR_FT = 0.5;

const DEFAULT_HARDWARE_OPTIONS = {
  hinge: {
    standard: 2.0,
    soft_close: 5.0,
    european: 3.5,
  },
  drawer_slide: {
    standard: 8.0,
    soft_close: 15.0,
    heavy_duty: 20.0,
  },
  handle: {
    basic: 5.0,
    modern: 8.0,
    designer: 15.0,
  },
  hanging_rod: 15.0,
};

const DEFAULT_LIGHTING_COST_PER_FT = 10.0;
const DEFAULT_GLASS_DOOR_ADDITIONAL_COST_PER_DOOR = 30.0;

const DEFAULT_FINISH_COSTS_PER_SQFT_EXTERIOR = {
  none: 0.0,
  paint: 2.5,
  veneer: 4.0,
  laminate: 3.0,
};

const DEFAULT_SOFA_UPHOLSTERY_COSTS_PER_SQFT = {
  fabric: 3.0,
  leather: 10.0,
  velvet: 5.0,
};
const DEFAULT_SOFA_CUSHION_COST_PER_CUSHION = 25.0;
const DEFAULT_SOFA_LEG_SET_COST = 40.0;
const DEFAULT_SOFA_ARM_COST_PER_PAIR = 50.0;

const CURRENCY_RATES = {
  USD: 1.0,
  INR: 83.5,
};

const CURRENCY_SYMBOLS = {
  USD: "$",
  INR: "₹",
};

// Define standard plywood sheet sizes in square feet.
// This is used to calculate the number of sheets required.
const PLYWOOD_SHEET_SIZES = [
  { name: "8x4", area: 32 },
  { name: "7x4", area: 28 },
  { name: "6x4", area: 24 },
  { name: "7x3", area: 21 },
];

// Helper functions
const inchesToFeet = (inches) => inches / 12;
const inchesToSqFeet = (inches) => inches / 144;

/**
 * Calculates the number of standard-sized sheets required to cover a total area.
 * This is a simplified greedy algorithm, starting with the largest sheets.
 * @param {number} totalAreaSqFt The total area in square feet to cover.
 * @returns {object} An object with sheet names as keys and quantities as values.
 */
const calculateSheetsRequired = (totalAreaSqFt) => {
  let remainingArea = totalAreaSqFt;
  const sheetCounts = {};

  // Sort sheets by area in descending order to use the largest sheets first.
  const sortedSheets = [...PLYWOOD_SHEET_SIZES].sort((a, b) => b.area - a.area);

  for (const sheet of sortedSheets) {
    if (remainingArea > 0) {
      const count = Math.floor(remainingArea / sheet.area);
      if (count > 0) {
        sheetCounts[sheet.name] = count;
        remainingArea -= count * sheet.area;
      }
    }
  }

  // If there's any remaining area, assume one more of the smallest sheet size is needed.
  if (remainingArea > 0 && sortedSheets.length > 0) {
    const smallestSheet = sortedSheets[sortedSheets.length - 1];
    sheetCounts[smallestSheet.name] =
      (sheetCounts[smallestSheet.name] || 0) + 1;
  }

  return sheetCounts;
};

// --- Wardrobe Calculation Logic ---
const calculateWardrobeCosts = ({
  height,
  width,
  depth,
  materialType,
  numShelves,
  numDrawers,
  hasHangingRod,
  hasBackPanel,
  numDoors,
  drawerHeight,
  drawerDepth,
  hingeType,
  drawerSlideType,
  handleType,
  hasLighting,
  hasGlassDoors,
  customMaterialCosts,
  customEdgeBandingCost,
  customHardwareOptions,
  customLightingCostPerFt,
  customGlassDoorAddCost,
}) => {
  let materialArea18mm = 0;
  let materialArea12mm = 0;
  let materialArea6mm = 0;
  let edgeBandingLengthFt = 0;
  let hardwareCount = { hinge: 0, drawer_slide: 0, handle: 0, hanging_rod: 0 };
  let laborHours = 0; // This is no longer used for cost but is kept to prevent code breaking
  let featuresCost = 0;

  const material18mmPrice = customMaterialCosts[`${materialType}_18mm`];
  const material12mmPrice = customMaterialCosts[`${materialType}_12mm`];
  const material6mmPrice = customMaterialCosts[`${materialType}_6mm`];

  // Carcass panels: 2 sides, 1 top, 1 bottom (all 18mm)
  const sidesAreaSqIn = 2 * height * depth;
  const topBottomAreaSqIn = 2 * width * depth;
  materialArea18mm += inchesToSqFeet(sidesAreaSqIn + topBottomAreaSqIn);
  edgeBandingLengthFt += inchesToFeet(2 * height + 2 * width);

  // Shelves - 12mm material
  const shelfAreaSqIn = numShelves * (width * (depth - 1));
  materialArea12mm += inchesToSqFeet(shelfAreaSqIn);
  edgeBandingLengthFt += inchesToFeet(numShelves * width);

  // Back Panel - 6mm material
  if (hasBackPanel) {
    const backPanelAreaSqIn = width * height;
    materialArea6mm += inchesToSqFeet(backPanelAreaSqIn);
  }

  // Doors - 18mm material (or adjust for glass)
  if (numDoors > 0) {
    const doorWidth = width / numDoors;
    materialArea18mm += inchesToSqFeet(numDoors * (doorWidth * height));
    edgeBandingLengthFt += inchesToFeet(
      numDoors * (2 * doorWidth + 2 * height)
    );
    hardwareCount.hinge += numDoors * 2;
    hardwareCount.handle += numDoors;

    if (hasGlassDoors) {
      featuresCost += numDoors * customGlassDoorAddCost;
    }
  }

  // Drawers - 12mm material for box, 18mm for front
  if (numDrawers > 0) {
    const avgDrawerWidth = width / (numDrawers > 0 ? numDrawers : 1);
    const drawerBoxAreaSqIn =
      numDrawers *
      (2 * avgDrawerWidth * drawerHeight +
        2 * drawerDepth * drawerHeight +
        avgDrawerWidth * drawerDepth);
    const drawerFrontAreaSqIn = numDrawers * (avgDrawerWidth * drawerHeight);
    materialArea12mm += inchesToSqFeet(drawerBoxAreaSqIn);
    materialArea18mm += inchesToSqFeet(drawerFrontAreaSqIn);

    edgeBandingLengthFt += inchesToFeet(
      numDrawers * (2 * avgDrawerWidth + 2 * drawerHeight)
    );
    hardwareCount.drawer_slide += numDrawers;
    hardwareCount.handle += numDrawers;
  }

  // Hanging Rod
  if (hasHangingRod) {
    hardwareCount.hanging_rod += 1;
  }

  // Simplified labor hours for reference, no longer used for cost calculation
  laborHours = (height * width * depth) / 10000;
  laborHours += numShelves * 0.5;
  laborHours += numDrawers * 2.0;
  laborHours += numDoors * 1.0;
  laborHours += hasHangingRod ? 0.2 : 0;
  laborHours += hasBackPanel ? 0.5 : 0;
  laborHours = Math.max(laborHours, 5);

  return {
    materialArea18mm,
    materialArea12mm,
    materialArea6mm,
    edgeBandingLengthFt,
    hardwareCount,
    laborHours,
    featuresCost,
    upholsteryAreaSqFt: 0,
  };
};

// --- Table Calculation Logic ---
const calculateTableCosts = ({
  tableLength,
  tableWidth,
  tableHeight,
  materialType,
  customMaterialCosts,
  customEdgeBandingCost,
}) => {
  let materialArea18mm = 0;
  let materialArea12mm = 0;
  let materialArea6mm = 0;
  let edgeBandingLengthFt = 0;
  let hardwareCount = { hinge: 0, drawer_slide: 0, handle: 0, hanging_rod: 0 };
  let laborHours = 0;
  let featuresCost = 0;

  const material18mmPrice = customMaterialCosts[`${materialType}_18mm`];

  // Tabletop - 18mm material
  const tabletopAreaSqIn = tableLength * tableWidth;
  materialArea18mm += inchesToSqFeet(tabletopAreaSqIn);
  edgeBandingLengthFt += inchesToFeet(2 * tableLength + 2 * tableWidth);

  // Legs/Frame - Simplified: 4 legs + perimeter frame. Assume 18mm material.
  const legHeight = tableHeight - 1;
  const legMaterialLinearFt = 4 * inchesToFeet(legHeight);
  const framePerimeterFt = inchesToFeet(2 * tableLength + 2 * tableWidth);
  const equivalentSqFtForLegsFrame =
    (legMaterialLinearFt + framePerimeterFt) * (3 / 12);
  materialArea18mm += equivalentSqFtForLegsFrame;

  // Simplified labor hours for reference, no longer used for cost calculation
  laborHours = (tableLength * tableWidth * tableHeight) / 50000;
  laborHours = Math.max(laborHours, 2);

  return {
    materialArea18mm,
    materialArea12mm,
    materialArea6mm,
    edgeBandingLengthFt,
    hardwareCount,
    laborHours,
    featuresCost,
    upholsteryAreaSqFt: 0,
  };
};

// --- Sofa Calculation Logic ---
const calculateSofaCosts = ({
  sofaLength,
  sofaDepth,
  sofaHeight,
  materialType,
  upholsteryType,
  numSeatCushions,
  numBackCushions,
  hasArms,
  customMaterialCosts,
  customSofaUpholsteryCosts,
  customSofaCushionCost,
  customSofaLegSetCost,
  customSofaArmCostPerPair,
}) => {
  let materialArea18mm = 0;
  let materialArea12mm = 0;
  let materialArea6mm = 0;
  let edgeBandingLengthFt = 0;
  let hardwareCount = { hinge: 0, drawer_slide: 0, handle: 0, hanging_rod: 0 };
  let laborHours = 0; // This is no longer used for cost but is kept to prevent code breaking
  let featuresCost = 0;
  let upholsteryAreaSqFt = 0;

  const frameMaterialPrice = customMaterialCosts[`${materialType}_18mm`];

  // Frame material (simplified)
  const frameVolumeInches = sofaLength * sofaDepth * sofaHeight;
  materialArea18mm += inchesToSqFeet(frameVolumeInches / 5);

  // Upholstery material
  const calculatedUpholsteryAreaSqIn =
    sofaLength * sofaHeight * 2 +
    sofaDepth * sofaHeight * 2 +
    sofaLength * sofaDepth;
  upholsteryAreaSqFt = inchesToSqFeet(calculatedUpholsteryAreaSqIn);

  // Cushions
  featuresCost += numSeatCushions * customSofaCushionCost;
  featuresCost += numBackCushions * customSofaCushionCost;

  // Legs
  featuresCost += customSofaLegSetCost;

  // Arms
  if (hasArms) {
    featuresCost += customSofaArmCostPerPair;
  }

  // Simplified labor hours for reference, no longer used for cost calculation
  laborHours = (sofaLength * sofaDepth * sofaHeight) / 15000;
  laborHours += numSeatCushions * 0.5;
  laborHours += numBackCushions * 0.5;
  laborHours += hasArms ? 1.5 : 0;
  laborHours = Math.max(laborHours, 8);

  return {
    materialArea18mm,
    materialArea12mm,
    materialArea6mm,
    edgeBandingLengthFt,
    hardwareCount,
    laborHours,
    featuresCost,
    upholsteryAreaSqFt,
  };
};

function App() {
  // --- Global State ---
  const [activeTab, setActiveTab] = useState("wardrobe"); // Controls which tab is active

  // Sofa specific dimensions and features
  const [sofaLength, setSofaLength] = useState(80);
  const [sofaDepth, setSofaDepth] = useState(36);
  const [sofaHeight, setSofaHeight] = useState(30);
  const [upholsteryType, setUpholsteryType] = useState("fabric");
  const [numSeatCushions, setNumSeatCushions] = useState(3);
  const [numBackCushions, setNumBackCushions] = useState(3);
  const [hasArms, setHasArms] = useState(true);

  // Table specific dimensions
  const [tableLength, setTableLength] = useState(48);
  const [tableWidth, setTableWidth] = useState(24);
  const [tableHeight, setTableHeight] = useState(30);

  // Wardrobe specific states
  const [height, setHeight] = useState(72);
  const [width, setWidth] = useState(36);
  const [depth, setDepth] = useState(24);
  const [numShelves, setNumShelves] = useState(2);
  const [numDrawers, setNumDrawers] = useState(0);
  const [hasHangingRod, setHasHangingRod] = useState(true);
  const [hasBackPanel, setHasBackPanel] = useState(true);
  const [numDoors, setNumDoors] = useState(2);
  const [drawerHeight, setDrawerHeight] = useState(8);
  const [drawerDepth, setDrawerDepth] = useState(20);

  // Common states
  const [materialType, setMaterialType] = useState("plywood");
  const [finishType, setFinishType] = useState("none");
  const [hingeType, setHingeType] = useState("standard");
  const [drawerSlideType, setDrawerSlideType] = useState("standard");
  const [handleType, setHandleType] = useState("basic");
  const [hasLighting, setHasLighting] = useState(false);
  const [hasGlassDoors, setHasGlassDoors] = useState(false);
  const [currency, setCurrency] = useState("INR");

  // Customizable Cost States (initialized with defaults)
  const [markupPercentage, setMarkupPercentage] = useState(20);
  const [customMaterialCosts, setCustomMaterialCosts] = useState({
    ...DEFAULT_MATERIAL_COSTS_PER_SQFT,
  });
  const [customEdgeBandingCost, setCustomEdgeBandingCost] = useState(
    DEFAULT_EDGE_BANDING_COST_PER_LINEAR_FT
  );
  const [customHardwareOptions, setCustomHardwareOptions] = useState(
    JSON.parse(JSON.stringify(DEFAULT_HARDWARE_OPTIONS))
  ); // Deep copy for nested objects
  const [customLightingCostPerFt, setCustomLightingCostPerFt] = useState(
    DEFAULT_LIGHTING_COST_PER_FT
  );
  const [customGlassDoorAddCost, setCustomGlassDoorAddCost] = useState(
    DEFAULT_GLASS_DOOR_ADDITIONAL_COST_PER_DOOR
  );
  const [customFinishCosts, setCustomFinishCosts] = useState({
    ...DEFAULT_FINISH_COSTS_PER_SQFT_EXTERIOR,
  });
  const [customSofaUpholsteryCosts, setCustomSofaUpholsteryCosts] = useState({
    ...DEFAULT_SOFA_UPHOLSTERY_COSTS_PER_SQFT,
  });
  const [customSofaCushionCost, setCustomSofaCushionCost] = useState(
    DEFAULT_SOFA_CUSHION_COST_PER_CUSHION
  );
  const [customSofaLegSetCost, setCustomSofaLegSetCost] = useState(
    DEFAULT_SOFA_LEG_SET_COST
  );
  const [customSofaArmCostPerPair, setCustomSofaArmCostPerPair] = useState(
    DEFAULT_SOFA_ARM_COST_PER_PAIR
  );

  // Calculated results states
  const [totalMaterialCost, setTotalMaterialCost] = useState(0);
  const [materialCost18mmDisplay, setMaterialCost18mmDisplay] = useState(0);
  const [materialCost12mmDisplay, setMaterialCost12mmDisplay] = useState(0);
  const [materialCost6mmDisplay, setMaterialCost6mmDisplay] = useState(0);
  const [totalEdgeBandingCost, setTotalEdgeBandingCost] = useState(0);
  const [totalHardwareCost, setTotalHardwareCost] = useState(0);
  const [estimatedLaborHours, setEstimatedLaborHours] = useState(0);
  const [estimatedLaborCost, setEstimatedLaborCost] = useState(0);
  const [additionalFeaturesCost, setAdditionalFeaturesCost] = useState(0);
  const [finalCost, setFinalCost] = useState(0);

  // Material quantities required states
  const [materialArea18mmRequired, setMaterialArea18mmRequired] = useState(0);
  const [materialArea12mmRequired, setMaterialArea12mmRequired] = useState(0);
  const [materialArea6mmRequired, setMaterialArea6mmRequired] = useState(0);
  const [edgeBandingLengthRequired, setEdgeBandingLengthRequired] = useState(0);
  const [upholsteryAreaRequired, setUpholsteryAreaRequired] = useState(0);
  const [numHingesRequired, setNumHingesRequired] = useState(0);
  const [numHandlesRequired, setNumHandlesRequired] = useState(0);
  const [lightingLengthRequired, setLightingLengthRequired] = useState(0);
  const [exteriorFinishAreaRequired, setExteriorFinishAreaRequired] =
    useState(0);
  const [numGlassDoorsRequired, setNumGlassDoorsRequired] = useState(0);

  // New states for plywood sheet counts
  const [plywoodSheets18mm, setPlywoodSheets18mm] = useState({});
  const [plywoodSheets12mm, setPlywoodSheets12mm] = useState({});
  const [plywoodSheets6mm, setPlywoodSheets6mm] = useState({});

  const [showDetails, setShowDetails] = useState(false);
  const [errors, setErrors] = useState({});

  // --- LOCAL INPUT STATES FOR RATES TAB ---
  const [markupInput, setMarkupInput] = useState("");
  const [edgeBandingInput, setEdgeBandingInput] = useState("");
  const [lightingCostInput, setLightingCostInput] = useState("");
  const [glassDoorCostInput, setGlassDoorCostInput] = useState("");

  // Create local states for nested objects
  const [materialCostsInput, setMaterialCostsInput] = useState({});
  const [hardwareCostsInput, setHardwareCostsInput] = useState({});
  const [finishCostsInput, setFinishCostsInput] = useState({});
  const [upholsteryCostsInput, setUpholsteryCostsInput] = useState({});
  const [cushionCostInput, setCushionCostInput] = useState("");
  const [legSetCostInput, setLegSetCostInput] = useState("");
  const [armCostInput, setArmCostInput] = useState("");

  // --- Load state from localStorage on initial mount ---
  useEffect(() => {
    try {
      const savedData = JSON.parse(
        localStorage.getItem("furnitureCalculatorRates")
      );
      if (savedData) {
        setMarkupPercentage(savedData.markupPercentage);
        setCustomMaterialCosts(savedData.customMaterialCosts);
        setCustomEdgeBandingCost(savedData.customEdgeBandingCost);
        setCustomHardwareOptions(savedData.customHardwareOptions);
        setCustomLightingCostPerFt(savedData.customLightingCostPerFt);
        setCustomGlassDoorAddCost(savedData.customGlassDoorAddCost);
        setCustomFinishCosts(savedData.customFinishCosts);
        setCustomSofaUpholsteryCosts(savedData.customSofaUpholsteryCosts);
        setCustomSofaCushionCost(savedData.customSofaCushionCost);
        setCustomSofaLegSetCost(savedData.customSofaLegSetCost);
        setCustomSofaArmCostPerPair(savedData.customSofaArmCostPerPair);
      }
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
    }
  }, []);

  // --- Sync local input states with global states whenever a rate changes ---
  useEffect(() => {
    // Sync Markup
    setMarkupInput(markupPercentage.toString());
    setEdgeBandingInput(
      (customEdgeBandingCost * CURRENCY_RATES[currency]).toFixed(2)
    );
    setLightingCostInput(
      (customLightingCostPerFt * CURRENCY_RATES[currency]).toFixed(2)
    );
    setGlassDoorCostInput(
      (customGlassDoorAddCost * CURRENCY_RATES[currency]).toFixed(2)
    );
    setCushionCostInput(
      (customSofaCushionCost * CURRENCY_RATES[currency]).toFixed(2)
    );
    setLegSetCostInput(
      (customSofaLegSetCost * CURRENCY_RATES[currency]).toFixed(2)
    );
    setArmCostInput(
      (customSofaArmCostPerPair * CURRENCY_RATES[currency]).toFixed(2)
    );

    // Sync nested objects
    const newMaterialCosts = {};
    for (const key in customMaterialCosts) {
      newMaterialCosts[key] = (
        customMaterialCosts[key] * CURRENCY_RATES[currency]
      ).toFixed(2);
    }
    setMaterialCostsInput(newMaterialCosts);

    const newHardwareCosts = {};
    for (const typeKey in customHardwareOptions) {
      if (typeof customHardwareOptions[typeKey] === "number") {
        newHardwareCosts[typeKey] = (
          customHardwareOptions[typeKey] * CURRENCY_RATES[currency]
        ).toFixed(2);
      } else {
        newHardwareCosts[typeKey] = {};
        for (const itemKey in customHardwareOptions[typeKey]) {
          newHardwareCosts[typeKey][itemKey] = (
            customHardwareOptions[typeKey][itemKey] * CURRENCY_RATES[currency]
          ).toFixed(2);
        }
      }
    }
    setHardwareCostsInput(newHardwareCosts);

    const newFinishCosts = {};
    for (const key in customFinishCosts) {
      newFinishCosts[key] = (
        customFinishCosts[key] * CURRENCY_RATES[currency]
      ).toFixed(2);
    }
    setFinishCostsInput(newFinishCosts);

    const newUpholsteryCosts = {};
    for (const key in customSofaUpholsteryCosts) {
      newUpholsteryCosts[key] = (
        customSofaUpholsteryCosts[key] * CURRENCY_RATES[currency]
      ).toFixed(2);
    }
    setUpholsteryCostsInput(newUpholsteryCosts);
  }, [
    markupPercentage,
    customMaterialCosts,
    customEdgeBandingCost,
    customHardwareOptions,
    customLightingCostPerFt,
    customGlassDoorAddCost,
    customFinishCosts,
    customSofaUpholsteryCosts,
    customSofaCushionCost,
    customSofaLegSetCost,
    customSofaArmCostPerPair,
    currency,
  ]);

  // --- Save state to localStorage whenever custom rates change ---
  useEffect(() => {
    const ratesToSave = {
      markupPercentage,
      customMaterialCosts,
      customEdgeBandingCost,
      customHardwareOptions,
      customLightingCostPerFt,
      customGlassDoorAddCost,
      customFinishCosts,
      customSofaUpholsteryCosts,
      customSofaCushionCost,
      customSofaLegSetCost,
      customSofaArmCostPerPair,
    };
    try {
      localStorage.setItem(
        "furnitureCalculatorRates",
        JSON.stringify(ratesToSave)
      );
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  }, [
    markupPercentage,
    customMaterialCosts,
    customEdgeBandingCost,
    customHardwareOptions,
    customLightingCostPerFt,
    customGlassDoorAddCost,
    customFinishCosts,
    customSofaUpholsteryCosts,
    customSofaCushionCost,
    customSofaLegSetCost,
    customSofaArmCostPerPair,
  ]);

  // Validation function
  const validateInputs = () => {
    const newErrors = {};
    if (markupPercentage < 0)
      newErrors.markupPercentage = "Cannot be negative.";
    if (markupPercentage > 100)
      newErrors.markupPercentage = "Cannot exceed 100%.";

    // Validate custom material costs
    Object.keys(customMaterialCosts).forEach((key) => {
      if (customMaterialCosts[key] < 0)
        newErrors[`customMaterialCosts_${key}`] = "Cannot be negative.";
    });
    if (customEdgeBandingCost < 0)
      newErrors.customEdgeBandingCost = "Cannot be negative.";
    Object.keys(customHardwareOptions).forEach((typeKey) => {
      if (
        typeof customHardwareOptions[typeKey] === "number" &&
        customHardwareOptions[typeKey] < 0
      ) {
        newErrors[`customHardwareOptions_${typeKey}`] = "Cannot be negative.";
      } else if (typeof customHardwareOptions[typeKey] === "object") {
        Object.keys(customHardwareOptions[typeKey]).forEach((itemKey) => {
          if (customHardwareOptions[typeKey][itemKey] < 0)
            newErrors[`customHardwareOptions_${typeKey}_${itemKey}`] =
              "Cannot be negative.";
        });
      }
    });
    if (customLightingCostPerFt < 0)
      newErrors.customLightingCostPerFt = "Cannot be negative.";
    if (customGlassDoorAddCost < 0)
      newErrors.customGlassDoorAddCost = "Cannot be negative.";
    Object.keys(customFinishCosts).forEach((key) => {
      if (customFinishCosts[key] < 0)
        newErrors[`customFinishCosts_${key}`] = "Cannot be negative.";
    });
    Object.keys(customSofaUpholsteryCosts).forEach((key) => {
      if (customSofaUpholsteryCosts[key] < 0)
        newErrors[`customSofaUpholsteryCosts_${key}`] = "Cannot be negative.";
    });
    if (customSofaCushionCost < 0)
      newErrors.customSofaCushionCost = "Cannot be negative.";
    if (customSofaLegSetCost < 0)
      newErrors.customSofaLegSetCost = "Cannot be negative.";
    if (customSofaArmCostPerPair < 0)
      newErrors.customSofaArmCostPerPair = "Cannot be negative.";

    if (activeTab === "wardrobe") {
      if (height <= 0) newErrors.height = "Height must be positive.";
      if (width <= 0) newErrors.width = "Width must be positive.";
      if (depth <= 0) newErrors.depth = "Depth must be positive.";
      if (numShelves < 0) newErrors.numShelves = "Cannot be negative.";
      if (numDrawers < 0) newErrors.numDrawers = "Cannot be negative.";
      if (numDoors < 0) newErrors.numDoors = "Cannot be negative.";
      if (numDrawers > 0 && drawerHeight <= 0)
        newErrors.drawerHeight = "Must be positive for drawers.";
      if (numDrawers > 0 && drawerDepth <= 0)
        newErrors.drawerDepth = "Must be positive for drawers.";
    } else if (activeTab === "table") {
      if (tableLength <= 0) newErrors.tableLength = "Length must be positive.";
      if (tableWidth <= 0) newErrors.tableWidth = "Width must be positive.";
      if (tableHeight <= 0) newErrors.tableHeight = "Height must be positive.";
    } else if (activeTab === "sofa") {
      if (sofaLength <= 0) newErrors.sofaLength = "Length must be positive.";
      if (sofaDepth <= 0) newErrors.sofaDepth = "Depth must be positive.";
      if (sofaHeight <= 0) newErrors.sofaHeight = "Height must be positive.";
      if (numSeatCushions < 0)
        newErrors.numSeatCushions = "Cannot be negative.";
      if (numBackCushions < 0)
        newErrors.numBackCushions = "Cannot be negative.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Main calculation effect
  useEffect(() => {
    if (activeTab !== "rates_materials" && validateInputs()) {
      performCalculations();
    } else if (activeTab === "rates_materials") {
      // Reset state when switching to the rates tab
      setTotalMaterialCost(0);
      setMaterialCost18mmDisplay(0);
      setMaterialCost12mmDisplay(0);
      setMaterialCost6mmDisplay(0);
      setTotalEdgeBandingCost(0);
      setTotalHardwareCost(0);
      setEstimatedLaborHours(0);
      setEstimatedLaborCost(0);
      setAdditionalFeaturesCost(0);
      setFinalCost(0);
      setMaterialArea18mmRequired(0);
      setMaterialArea12mmRequired(0);
      setMaterialArea6mmRequired(0);
      setEdgeBandingLengthRequired(0);
      setUpholsteryAreaRequired(0);
      setNumHingesRequired(0);
      setNumHandlesRequired(0);
      setLightingLengthRequired(0);
      setExteriorFinishAreaRequired(0);
      setNumGlassDoorsRequired(0);
    } else {
      // Reset costs and quantities if inputs are invalid
      setTotalMaterialCost(0);
      setMaterialCost18mmDisplay(0);
      setMaterialCost12mmDisplay(0);
      setMaterialCost6mmDisplay(0);
      setTotalEdgeBandingCost(0);
      setTotalHardwareCost(0);
      setEstimatedLaborHours(0);
      setEstimatedLaborCost(0);
      setAdditionalFeaturesCost(0);
      setFinalCost(0);

      setMaterialArea18mmRequired(0);
      setMaterialArea12mmRequired(0);
      setMaterialArea6mmRequired(0);
      setEdgeBandingLengthRequired(0);
      setUpholsteryAreaRequired(0);
      setNumHingesRequired(0);
      setNumHandlesRequired(0);
      setLightingLengthRequired(0);
      setExteriorFinishAreaRequired(0);
      setNumGlassDoorsRequired(0);
    }
  }, [
    activeTab,
    height,
    width,
    depth,
    materialType,
    numShelves,
    numDrawers,
    hasHangingRod,
    hasBackPanel,
    numDoors,
    drawerHeight,
    drawerDepth,
    markupPercentage,
    hingeType,
    drawerSlideType,
    handleType,
    hasLighting,
    finishType,
    hasGlassDoors,
    currency,
    tableLength,
    tableWidth,
    tableHeight,
    sofaLength,
    sofaDepth,
    sofaHeight,
    upholsteryType,
    numSeatCushions,
    numBackCushions,
    hasArms,
    // Custom cost dependencies
    customMaterialCosts,
    customEdgeBandingCost,
    customHardwareOptions,
    customLightingCostPerFt,
    customGlassDoorAddCost,
    customFinishCosts,
    customSofaUpholsteryCosts,
    customSofaCushionCost,
    customSofaLegSetCost,
    customSofaArmCostPerPair,
  ]);

  // Function to perform all calculations based on furniture type
  const performCalculations = () => {
    let calculatedResults;

    if (activeTab === "wardrobe") {
      calculatedResults = calculateWardrobeCosts({
        height,
        width,
        depth,
        materialType,
        numShelves,
        numDrawers,
        hasHangingRod,
        hasBackPanel,
        numDoors,
        drawerHeight,
        drawerDepth,
        hingeType,
        drawerSlideType,
        handleType,
        hasLighting,
        hasGlassDoors,
        customMaterialCosts,
        customEdgeBandingCost,
        customHardwareOptions,
        customLightingCostPerFt,
        customGlassDoorAddCost,
      });
    } else if (activeTab === "table") {
      calculatedResults = calculateTableCosts({
        tableLength,
        tableWidth,
        tableHeight,
        materialType,
        customMaterialCosts,
        customEdgeBandingCost,
      });
      calculatedResults.hardwareCount = {
        hinge: 0,
        drawer_slide: 0,
        handle: 0,
        hanging_rod: 0,
      };
      calculatedResults.featuresCost = 0;
    } else if (activeTab === "sofa") {
      calculatedResults = calculateSofaCosts({
        sofaLength,
        sofaDepth,
        sofaHeight,
        materialType,
        upholsteryType,
        numSeatCushions,
        numBackCushions,
        hasArms,
        customMaterialCosts,
        customSofaUpholsteryCosts,
        customSofaCushionCost,
        customSofaLegSetCost,
        customSofaArmCostPerPair,
      });
      calculatedResults.edgeBandingLengthFt = 0;
      calculatedResults.hardwareCount = {
        hinge: 0,
        drawer_slide: 0,
        handle: 0,
        hanging_rod: 0,
      };
    } else {
      // This is the case for 'rates_materials' or invalid tab
      // Prevent destructuring error
      return;
    }

    const {
      materialArea18mm,
      materialArea12mm,
      materialArea6mm,
      edgeBandingLengthFt,
      hardwareCount,
      featuresCost,
      upholsteryAreaSqFt,
    } = calculatedResults;

    // Calculate material costs from areas using custom rates
    const calculatedMaterialCost18mm =
      materialArea18mm * customMaterialCosts[`${materialType}_18mm`];
    const calculatedMaterialCost12mm =
      materialArea12mm * customMaterialCosts[`${materialType}_12mm`];
    const calculatedMaterialCost6mm =
      materialArea6mm * customMaterialCosts[`${materialType}_6mm`];

    const calculatedTotalMaterialCost =
      calculatedMaterialCost18mm +
      calculatedMaterialCost12mm +
      calculatedMaterialCost6mm;

    const calculatedEdgeBandingCost =
      edgeBandingLengthFt * customEdgeBandingCost;

    let calculatedHardwareCost = 0;
    calculatedHardwareCost +=
      hardwareCount.hinge * (customHardwareOptions.hinge[hingeType] || 0);
    calculatedHardwareCost +=
      hardwareCount.drawer_slide *
      (customHardwareOptions.drawer_slide[drawerSlideType] || 0);
    calculatedHardwareCost +=
      hardwareCount.handle * (customHardwareOptions.handle[handleType] || 0);
    calculatedHardwareCost +=
      hardwareCount.hanging_rod * (customHardwareOptions.hanging_rod || 0);

    let calculatedAdditionalFeaturesCost = featuresCost;

    let currentLightingLength = 0;
    if (hasLighting && activeTab === "wardrobe") {
      currentLightingLength = inchesToFeet(width);
      calculatedAdditionalFeaturesCost +=
        currentLightingLength * customLightingCostPerFt;
    }

    let currentExteriorAreaSqFt = 0;
    if (finishType !== "none") {
      let exteriorAreaSqIn = 0;
      if (activeTab === "wardrobe") {
        exteriorAreaSqIn = 2 * height * depth + width * height + width * depth;
      } else if (activeTab === "table") {
        exteriorAreaSqIn =
          tableLength * tableWidth +
          2 * tableLength * tableHeight +
          2 * tableWidth * tableHeight;
      } else if (activeTab === "sofa") {
        exteriorAreaSqIn = sofaLength * sofaHeight + sofaDepth * sofaHeight;
      }
      currentExteriorAreaSqFt = inchesToSqFeet(exteriorAreaSqIn);
      calculatedAdditionalFeaturesCost +=
        currentExteriorAreaSqFt * customFinishCosts[finishType];
    }

    let currentNumGlassDoors = 0;
    if (hasGlassDoors && activeTab === "wardrobe") {
      currentNumGlassDoors = numDoors;
    }

    const baseCost =
      calculatedTotalMaterialCost +
      calculatedEdgeBandingCost +
      calculatedHardwareCost +
      calculatedAdditionalFeaturesCost;
    const calculatedLaborCost = baseCost * 0.7;

    const subTotalCost = baseCost + calculatedLaborCost;

    const finalCalculatedCost = subTotalCost * (1 + markupPercentage / 100);

    // Update state with calculated values
    setTotalMaterialCost(calculatedTotalMaterialCost);
    setMaterialCost18mmDisplay(calculatedMaterialCost18mm);
    setMaterialCost12mmDisplay(calculatedMaterialCost12mm);
    setMaterialCost6mmDisplay(calculatedMaterialCost6mm);
    setTotalEdgeBandingCost(calculatedEdgeBandingCost);
    setTotalHardwareCost(calculatedHardwareCost);
    setEstimatedLaborHours(0); // Reset to 0 as it's no longer used for calculation
    setEstimatedLaborCost(calculatedLaborCost);
    setAdditionalFeaturesCost(calculatedAdditionalFeaturesCost);
    setFinalCost(finalCalculatedCost);

    // Update material quantities required
    setMaterialArea18mmRequired(materialArea18mm);
    setMaterialArea12mmRequired(materialArea12mm);
    setMaterialArea6mmRequired(materialArea6mm);
    setEdgeBandingLengthRequired(edgeBandingLengthFt);
    setUpholsteryAreaRequired(upholsteryAreaSqFt);

    // Update specific quantities requested by user
    setNumHingesRequired(hardwareCount.hinge);
    setNumHandlesRequired(hardwareCount.handle);
    setLightingLengthRequired(currentLightingLength);
    setExteriorFinishAreaRequired(currentExteriorAreaSqFt);
    setNumGlassDoorsRequired(currentNumGlassDoors);

    // Calculate and set plywood sheet counts
    setPlywoodSheets18mm(calculateSheetsRequired(materialArea18mm));
    setPlywoodSheets12mm(calculateSheetsRequired(materialArea12mm));
    setPlywoodSheets6mm(calculateSheetsRequired(materialArea6mm));
  };

  // Helper to render input fields with error handling
  const renderInputField = (
    id,
    label,
    value,
    onChange,
    type = "number",
    min = 0,
    max = Infinity,
    currencyDependent = false
  ) => (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <input
        type={type}
        id={id}
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          const parsedValue = val === "" ? "" : parseFloat(val);
          if (parsedValue >= min && parsedValue <= max) {
            onChange(parsedValue);
          }
        }}
        onBlur={(e) => {
          const val = parseFloat(e.target.value);
          if (isNaN(val) || val < min) {
            onChange(min);
          } else {
            onChange(val);
          }
        }}
        className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${
          errors[id] ? "border-red-500" : "border-gray-300"
        }`}
        min={min}
        max={max}
      />
      {errors[id] && <p className="text-red-500 text-xs mt-1">{errors[id]}</p>}
    </div>
  );

  // Helper to render select fields
  const renderSelectField = (id, label, value, onChange, options) => (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-white"
      >
        {Object.entries(options).map(([key, val]) => (
          <option key={key} value={key}>
            {key
              .replace(/_/g, " ")
              .split(" ")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")}
            {typeof val === "number" &&
              ` (${CURRENCY_SYMBOLS[currency]}${(
                val * CURRENCY_RATES[currency]
              ).toFixed(2)})`}
          </option>
        ))}
      </select>
    </div>
  );

  // Helper to format currency
  const formatCurrency = (amount) => {
    const rate = CURRENCY_RATES[currency];
    const symbol = CURRENCY_SYMBOLS[currency];
    return `${symbol}${(amount * rate).toFixed(2)}`;
  };

  // Helper to format custom costs in the selected currency
  const formatCustomCost = (amount) => {
    const rate = CURRENCY_RATES[currency];
    const symbol = CURRENCY_SYMBOLS[currency];
    return `${symbol}${(amount * rate).toFixed(2)}`;
  };

  // Helper to render sheet count details
  const renderSheetDetails = (thickness, sheets) => {
    const sheetEntries = Object.entries(sheets);
    if (sheetEntries.length === 0) return null;

    return (
      <div className="pl-4 mt-2">
        <p className="text-sm font-medium text-gray-600">
          Plywood {thickness} Sheets Required:
        </p>
        <ul className="list-disc list-inside text-xs text-gray-500">
          {sheetEntries.map(([size, count]) => (
            <li key={size}>
              {count} sheet(s) of {size} ft.
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 font-sans text-gray-800 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden">
        <header className="bg-blue-600 text-white p-6 flex items-center justify-center rounded-t-xl">
          <LayoutDashboard className="w-8 h-8 mr-3" />
          <h1 className="text-3xl font-bold text-center">
            Furniture Cost Estimator
          </h1>
        </header>

        {/* Furniture Type Tabs */}
        <nav className="flex bg-gray-100 p-2 rounded-b-lg shadow-sm">
          <button
            onClick={() => setActiveTab("wardrobe")}
            className={`flex-1 py-3 px-4 text-center rounded-lg font-medium transition-all duration-300 ease-in-out flex items-center justify-center space-x-2
								${activeTab === "wardrobe" ? "tab-active" : "text-gray-700 hover:bg-gray-200"}`}
          >
            <Box className="w-5 h-5" /> <span>Wardrobe</span>
          </button>
          <button
            onClick={() => setActiveTab("table")}
            className={`flex-1 py-3 px-4 text-center rounded-lg font-medium transition-all duration-300 ease-in-out flex items-center justify-center space-x-2
								${activeTab === "table" ? "tab-active" : "text-gray-700 hover:bg-gray-200"}`}
          >
            <Table className="w-5 h-5" /> <span>Table</span>
          </button>
          <button
            onClick={() => setActiveTab("sofa")}
            className={`flex-1 py-3 px-4 text-center rounded-lg font-medium transition-all duration-300 ease-in-out flex items-center justify-center space-x-2
								${activeTab === "sofa" ? "tab-active" : "text-gray-700 hover:bg-gray-200"}`}
          >
            <Sofa className="w-5 h-5" /> <span>Sofa Set</span>
          </button>
          <button
            onClick={() => setActiveTab("rates_materials")}
            className={`flex-1 py-3 px-4 text-center rounded-lg font-medium transition-all duration-300 ease-in-out flex items-center justify-center space-x-2
								${
                  activeTab === "rates_materials"
                    ? "tab-active"
                    : "text-gray-700 hover:bg-gray-200"
                }`}
          >
            <Settings className="w-5 h-5" /> <span>Rates & Materials</span>
          </button>
        </nav>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Conditional Rendering based on activeTab */}
          {activeTab === "wardrobe" && (
            <>
              <section className="bg-blue-50 p-6 rounded-lg shadow-inner">
                <h2 className="text-2xl font-semibold text-blue-800 mb-6 flex items-center">
                  <Ruler className="w-6 h-6 mr-2" /> Wardrobe Dimensions &
                  Materials
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {renderInputField(
                    "height",
                    "Height (inches)",
                    height,
                    setHeight,
                    "number",
                    1
                  )}
                  {renderInputField(
                    "width",
                    "Width (inches)",
                    width,
                    setWidth,
                    "number",
                    1
                  )}
                  {renderInputField(
                    "depth",
                    "Depth (inches)",
                    depth,
                    setDepth,
                    "number",
                    1
                  )}
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="materialType"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Main Material
                  </label>
                  <select
                    id="materialType"
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-white"
                  >
                    <option value="plywood">Plywood</option>
                    <option value="mdf">MDF</option>
                    <option value="solid_wood">Solid Wood</option>
                  </select>
                </div>

                <h3 className="text-xl font-medium text-blue-700 mb-4 flex items-center">
                  <Box className="w-5 h-5 mr-2" /> Internal Features
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderInputField(
                    "numShelves",
                    "Number of Shelves",
                    numShelves,
                    setNumShelves,
                    "number",
                    0
                  )}
                  {renderInputField(
                    "numDrawers",
                    "Number of Drawers",
                    numDrawers,
                    setNumDrawers,
                    "number",
                    0
                  )}
                  {numDrawers > 0 && (
                    <>
                      {renderInputField(
                        "drawerHeight",
                        "Avg. Drawer Height (inches)",
                        drawerHeight,
                        setDrawerHeight,
                        "number",
                        1
                      )}
                      {renderInputField(
                        "drawerDepth",
                        "Avg. Drawer Depth (inches)",
                        drawerDepth,
                        setDrawerDepth,
                        "number",
                        1
                      )}
                    </>
                  )}
                  {renderInputField(
                    "numDoors",
                    "Number of Doors",
                    numDoors,
                    setNumDoors,
                    "number",
                    0
                  )}
                  <div className="flex items-center mt-4">
                    <input
                      type="checkbox"
                      id="hasHangingRod"
                      checked={hasHangingRod}
                      onChange={(e) => setHasHangingRod(e.target.checked)}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="hasHangingRod"
                      className="ml-2 block text-sm font-medium text-gray-700"
                    >
                      Include Hanging Rod
                    </label>
                  </div>
                  <div className="flex items-center mt-4">
                    <input
                      type="checkbox"
                      id="hasBackPanel"
                      checked={hasBackPanel}
                      onChange={(e) => setHasBackPanel(e.target.checked)}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="hasBackPanel"
                      className="ml-2 block text-sm font-medium text-gray-700"
                    >
                      Include Back Panel
                    </label>
                  </div>
                </div>
              </section>

              <section className="bg-purple-50 p-6 rounded-lg shadow-inner">
                <h2 className="text-2xl font-semibold text-purple-800 mb-6 flex items-center">
                  <Hammer className="w-6 h-6 mr-2" /> Hardware Selection
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {renderSelectField(
                    "hingeType",
                    "Hinge Type",
                    hingeType,
                    setHingeType,
                    customHardwareOptions.hinge
                  )}
                  {renderSelectField(
                    "drawerSlideType",
                    "Drawer Slide Type",
                    drawerSlideType,
                    setDrawerSlideType,
                    customHardwareOptions.drawer_slide
                  )}
                  {renderSelectField(
                    "handleType",
                    "Handle Type",
                    handleType,
                    setHandleType,
                    customHardwareOptions.handle
                  )}
                </div>
              </section>

              <section className="bg-yellow-50 p-6 rounded-lg shadow-inner">
                <h2 className="text-2xl font-semibold text-yellow-800 mb-6 flex items-center">
                  <Lightbulb className="w-6 h-6 mr-2" /> Additional Options
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="hasLighting"
                      checked={hasLighting}
                      onChange={(e) => setHasLighting(e.target.checked)}
                      className="h-5 w-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                    />
                    <label
                      htmlFor="hasLighting"
                      className="ml-2 block text-sm font-medium text-gray-700"
                    >
                      Include Lighting
                    </label>
                  </div>
                  {renderSelectField(
                    "finishType",
                    "Exterior Finish",
                    finishType,
                    setFinishType,
                    customFinishCosts
                  )}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="hasGlassDoors"
                      checked={hasGlassDoors}
                      onChange={(e) => setHasGlassDoors(e.target.checked)}
                      className="h-5 w-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                    />
                    <label
                      htmlFor="hasGlassDoors"
                      className="ml-2 block text-sm font-medium text-gray-700"
                    >
                      Glass Doors
                    </label>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === "table" && (
            <>
              <section className="bg-blue-50 p-6 rounded-lg shadow-inner">
                <h2 className="text-2xl font-semibold text-blue-800 mb-6 flex items-center">
                  <Ruler className="w-6 h-6 mr-2" /> Table Dimensions &
                  Materials
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {renderInputField(
                    "tableLength",
                    "Length (inches)",
                    tableLength,
                    setTableLength,
                    "number",
                    1
                  )}
                  {renderInputField(
                    "tableWidth",
                    "Width (inches)",
                    tableWidth,
                    setTableWidth,
                    "number",
                    1
                  )}
                  {renderInputField(
                    "tableHeight",
                    "Height (inches)",
                    tableHeight,
                    setTableHeight,
                    "number",
                    1
                  )}
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="materialType"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Main Material
                  </label>
                  <select
                    id="materialType"
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-white"
                  >
                    <option value="plywood">Plywood</option>
                    <option value="mdf">MDF</option>
                    <option value="solid_wood">Solid Wood</option>
                  </select>
                </div>
              </section>
              <section className="bg-yellow-50 p-6 rounded-lg shadow-inner">
                <h2 className="text-2xl font-semibold text-yellow-800 mb-6 flex items-center">
                  <Lightbulb className="w-6 h-6 mr-2" /> Additional Options
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderSelectField(
                    "finishType",
                    "Exterior Finish",
                    finishType,
                    setFinishType,
                    customFinishCosts
                  )}
                </div>
              </section>
            </>
          )}

          {activeTab === "sofa" && (
            <>
              <section className="bg-blue-50 p-6 rounded-lg shadow-inner">
                <h2 className="text-2xl font-semibold text-blue-800 mb-6 flex items-center">
                  <Ruler className="w-6 h-6 mr-2" /> Sofa Dimensions & Materials
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {renderInputField(
                    "sofaLength",
                    "Length (inches)",
                    sofaLength,
                    setSofaLength,
                    "number",
                    1
                  )}
                  {renderInputField(
                    "sofaDepth",
                    "Depth (inches)",
                    sofaDepth,
                    setSofaDepth,
                    "number",
                    1
                  )}
                  {renderInputField(
                    "sofaHeight",
                    "Height (inches)",
                    sofaHeight,
                    setSofaHeight,
                    "number",
                    1
                  )}
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="materialType"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Frame Material
                  </label>
                  <select
                    id="materialType"
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-white"
                  >
                    <option value="plywood">Plywood</option>
                    <option value="mdf">MDF</option>
                    <option value="solid_wood">Solid Wood</option>
                  </select>
                </div>
                <div className="mb-6">
                  {renderSelectField(
                    "upholsteryType",
                    "Upholstery Type",
                    upholsteryType,
                    setUpholsteryType,
                    customSofaUpholsteryCosts
                  )}
                </div>

                <h3 className="text-xl font-medium text-blue-700 mb-4 flex items-center">
                  <Box className="w-5 h-5 mr-2" /> Sofa Features
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderInputField(
                    "numSeatCushions",
                    "Number of Seat Cushions",
                    numSeatCushions,
                    setNumSeatCushions,
                    "number",
                    0
                  )}
                  {renderInputField(
                    "numBackCushions",
                    "Number of Back Cushions",
                    numBackCushions,
                    setNumBackCushions,
                    "number",
                    0
                  )}
                  <div className="flex items-center mt-4">
                    <input
                      type="checkbox"
                      id="hasArms"
                      checked={hasArms}
                      onChange={(e) => setHasArms(e.target.checked)}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="hasArms"
                      className="ml-2 block text-sm font-medium text-gray-700"
                    >
                      Include Arms
                    </label>
                  </div>
                </div>
              </section>
              <section className="bg-yellow-50 p-6 rounded-lg shadow-inner">
                <h2 className="text-2xl font-semibold text-yellow-800 mb-6 flex items-center">
                  <Lightbulb className="w-6 h-6 mr-2" /> Additional Options
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderSelectField(
                    "finishType",
                    "Exterior Finish",
                    finishType,
                    setFinishType,
                    customFinishCosts
                  )}
                </div>
              </section>
            </>
          )}

          {activeTab === "rates_materials" && (
            <section className="bg-indigo-50 p-6 rounded-lg shadow-inner">
              <h2 className="text-2xl font-semibold text-indigo-800 mb-6 flex items-center">
                <Settings className="w-6 h-6 mr-2" /> Custom Rates & Materials
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Adjust the base costs for materials, hardware, and labor here.
                All values are displayed in Indian Rupees (₹).
                <span className="block mt-2 font-semibold text-indigo-700">
                  Your custom rates are automatically saved.
                </span>
              </p>

              {/* Markup */}
              <h3 className="text-xl font-medium text-indigo-700 mb-4 flex items-center">
                <Percent className="w-5 h-5 mr-2" /> Markup
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label
                    htmlFor="markupPercentage"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Markup Percentage (%)
                  </label>
                  <input
                    type="number"
                    id="markupPercentage"
                    value={markupInput}
                    onChange={(e) => setMarkupInput(e.target.value)}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      setMarkupPercentage(isNaN(val) || val < 0 ? 0 : val);
                      setMarkupInput(isNaN(val) ? "0" : val.toString());
                    }}
                    className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${
                      errors.markupPercentage
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    min="0"
                    max="100"
                  />
                  {errors.markupPercentage && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.markupPercentage}
                    </p>
                  )}
                </div>
              </div>

              {/* Main Materials */}
              <h3 className="text-xl font-medium text-indigo-700 mb-4 flex items-center">
                <Box className="w-5 h-5 mr-2" /> Main Materials (per sq. ft.)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {Object.entries(customMaterialCosts).map(([key, value]) => (
                  <div key={key}>
                    <label
                      htmlFor={`material-${key}`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {key
                        .replace(/_/g, " ")
                        .split(" ")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}{" "}
                      ({CURRENCY_SYMBOLS[currency]}/sq. ft.)
                    </label>
                    <input
                      type="number"
                      id={`material-${key}`}
                      value={materialCostsInput[key] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMaterialCostsInput((prev) => ({
                          ...prev,
                          [key]: val,
                        }));
                      }}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        const baseValue = isNaN(val)
                          ? 0
                          : val / CURRENCY_RATES[currency];
                        setCustomMaterialCosts((prev) => ({
                          ...prev,
                          [key]: baseValue,
                        }));
                        setMaterialCostsInput((prev) => ({
                          ...prev,
                          [key]: isNaN(val) ? "0.00" : val.toFixed(2),
                        }));
                      }}
                      className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${
                        errors[`customMaterialCosts_${key}`]
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      min="0"
                    />
                    {errors[`customMaterialCosts_${key}`] && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors[`customMaterialCosts_${key}`]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Edge Banding */}
              <h3 className="text-xl font-medium text-indigo-700 mb-4 flex items-center">
                <Ruler className="w-5 h-5 mr-2" /> Edge Banding (per linear ft.)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label
                    htmlFor="customEdgeBandingCost"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Edge Banding ({CURRENCY_SYMBOLS[currency]}/linear ft.)
                  </label>
                  <input
                    type="number"
                    id="customEdgeBandingCost"
                    value={edgeBandingInput}
                    onChange={(e) => setEdgeBandingInput(e.target.value)}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      const baseValue = isNaN(val)
                        ? 0
                        : val / CURRENCY_RATES[currency];
                      setCustomEdgeBandingCost(baseValue);
                      setEdgeBandingInput(isNaN(val) ? "0.00" : val.toFixed(2));
                    }}
                    className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${
                      errors.customEdgeBandingCost
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    min="0"
                  />
                  {errors.customEdgeBandingCost && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.customEdgeBandingCost}
                    </p>
                  )}
                </div>
              </div>

              {/* Hardware */}
              <h3 className="text-xl font-medium text-indigo-700 mb-4 flex items-center">
                <Hammer className="w-5 h-5 mr-2" /> Hardware (per unit/pair)
              </h3>
              <div className="space-y-6 mb-8">
                {Object.entries(customHardwareOptions)
                  .filter(([typeKey]) => typeKey !== "hanging_rod")
                  .map(([typeKey, typeOptions]) => (
                    <div key={typeKey}>
                      <h4 className="text-lg font-medium text-gray-700 mb-2">
                        {typeKey
                          .replace(/_/g, " ")
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Object.entries(typeOptions).map(([itemKey, value]) => (
                          <div key={`${typeKey}-${itemKey}`}>
                            <label
                              htmlFor={`hardware-${typeKey}-${itemKey}`}
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              {itemKey
                                .replace(/_/g, " ")
                                .split(" ")
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                )
                                .join(" ")}{" "}
                              ({CURRENCY_SYMBOLS[currency]})
                            </label>
                            <input
                              type="number"
                              id={`hardware-${typeKey}-${itemKey}`}
                              value={
                                hardwareCostsInput[typeKey]?.[itemKey] || ""
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                setHardwareCostsInput((prev) => ({
                                  ...prev,
                                  [typeKey]: {
                                    ...prev[typeKey],
                                    [itemKey]: val,
                                  },
                                }));
                              }}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                const baseValue = isNaN(val)
                                  ? 0
                                  : val / CURRENCY_RATES[currency];
                                setCustomHardwareOptions((prev) => ({
                                  ...prev,
                                  [typeKey]: {
                                    ...prev[typeKey],
                                    [itemKey]: baseValue,
                                  },
                                }));
                                setHardwareCostsInput((prev) => ({
                                  ...prev,
                                  [typeKey]: {
                                    ...prev[typeKey],
                                    [itemKey]: isNaN(val)
                                      ? "0.00"
                                      : val.toFixed(2),
                                  },
                                }));
                              }}
                              className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${
                                errors[
                                  `customHardwareOptions_${typeKey}_${itemKey}`
                                ]
                                  ? "border-red-500"
                                  : "border-gray-300"
                              }`}
                              min="0"
                            />
                            {errors[
                              `customHardwareOptions_${typeKey}_${itemKey}`
                            ] && (
                              <p className="text-red-500 text-xs mt-1">
                                {
                                  errors[
                                    `customHardwareOptions_${typeKey}_${itemKey}`
                                  ]
                                }
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                <div>
                  <label
                    htmlFor="customHardwareOptions_hanging_rod"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Hanging Rod ({CURRENCY_SYMBOLS[currency]})
                  </label>
                  <input
                    type="number"
                    id="customHardwareOptions_hanging_rod"
                    value={hardwareCostsInput.hanging_rod || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHardwareCostsInput((prev) => ({
                        ...prev,
                        hanging_rod: val,
                      }));
                    }}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      const baseValue = isNaN(val)
                        ? 0
                        : val / CURRENCY_RATES[currency];
                      setCustomHardwareOptions((prev) => ({
                        ...prev,
                        hanging_rod: baseValue,
                      }));
                      setHardwareCostsInput((prev) => ({
                        ...prev,
                        hanging_rod: isNaN(val) ? "0.00" : val.toFixed(2),
                      }));
                    }}
                    className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${
                      errors.customHardwareOptions_hanging_rod
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    min="0"
                  />
                  {errors.customHardwareOptions_hanging_rod && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.customHardwareOptions_hanging_rod}
                    </p>
                  )}
                </div>
              </div>

              {/* Finishes */}
              <h3 className="text-xl font-medium text-indigo-700 mb-4 flex items-center">
                <Palette className="w-5 h-5 mr-2" /> Exterior Finishes (per sq.
                ft.)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {Object.entries(customFinishCosts)
                  .filter(([key]) => key !== "none")
                  .map(([key, value]) => (
                    <div key={key}>
                      <label
                        htmlFor={`finish-${key}`}
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        {key
                          .replace(/_/g, " ")
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}{" "}
                        ({CURRENCY_SYMBOLS[currency]}/sq. ft.)
                      </label>
                      <input
                        type="number"
                        id={`finish-${key}`}
                        value={finishCostsInput[key] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFinishCostsInput((prev) => ({
                            ...prev,
                            [key]: val,
                          }));
                        }}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          const baseValue = isNaN(val)
                            ? 0
                            : val / CURRENCY_RATES[currency];
                          setCustomFinishCosts((prev) => ({
                            ...prev,
                            [key]: baseValue,
                          }));
                          setFinishCostsInput((prev) => ({
                            ...prev,
                            [key]: isNaN(val) ? "0.00" : val.toFixed(2),
                          }));
                        }}
                        className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${
                          errors[`customFinishCosts_${key}`]
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        min="0"
                      />
                      {errors[`customFinishCosts_${key}`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors[`customFinishCosts_${key}`]}
                        </p>
                      )}
                    </div>
                  ))}
              </div>

              {/* Other Features */}
              <h3 className="text-xl font-medium text-indigo-700 mb-4 flex items-center">
                <Lightbulb className="w-5 h-5 mr-2" /> Other Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label
                    htmlFor="customLightingCostPerFt"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Lighting ({CURRENCY_SYMBOLS[currency]}/linear ft.)
                  </label>
                  <input
                    type="number"
                    id="customLightingCostPerFt"
                    value={lightingCostInput}
                    onChange={(e) => setLightingCostInput(e.target.value)}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      const baseValue = isNaN(val)
                        ? 0
                        : val / CURRENCY_RATES[currency];
                      setCustomLightingCostPerFt(baseValue);
                      setLightingCostInput(
                        isNaN(val) ? "0.00" : val.toFixed(2)
                      );
                    }}
                    className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${
                      errors.customLightingCostPerFt
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    min="0"
                  />
                  {errors.customLightingCostPerFt && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.customLightingCostPerFt}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="customGlassDoorAddCost"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Glass Door Additional Cost ({CURRENCY_SYMBOLS[currency]}
                    /door)
                  </label>
                  <input
                    type="number"
                    id="customGlassDoorAddCost"
                    value={glassDoorCostInput}
                    onChange={(e) => setGlassDoorCostInput(e.target.value)}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      const baseValue = isNaN(val)
                        ? 0
                        : val / CURRENCY_RATES[currency];
                      setCustomGlassDoorAddCost(baseValue);
                      setGlassDoorCostInput(
                        isNaN(val) ? "0.00" : val.toFixed(2)
                      );
                    }}
                    className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${
                      errors.customGlassDoorAddCost
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    min="0"
                  />
                  {errors.customGlassDoorAddCost && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.customGlassDoorAddCost}
                    </p>
                  )}
                </div>
              </div>

              {/* Sofa Specific Costs */}
              <h3 className="text-xl font-medium text-indigo-700 mb-4 flex items-center">
                <Sofa className="w-5 h-5 mr-2" /> Sofa Specific Costs
              </h3>
              <div className="space-y-6">
                <h4 className="text-lg font-medium text-gray-700 mb-2">
                  Upholstery (per sq. ft.)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.entries(customSofaUpholsteryCosts).map(
                    ([key, value]) => (
                      <div key={key}>
                        <label
                          htmlFor={`upholstery-${key}`}
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          {key
                            .replace(/_/g, " ")
                            .split(" ")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                            )
                            .join(" ")}{" "}
                          ({CURRENCY_SYMBOLS[currency]}/sq. ft.)
                        </label>
                        <input
                          type="number"
                          id={`upholstery-${key}`}
                          value={upholsteryCostsInput[key] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setUpholsteryCostsInput((prev) => ({
                              ...prev,
                              [key]: val,
                            }));
                          }}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            const baseValue = isNaN(val)
                              ? 0
                              : val / CURRENCY_RATES[currency];
                            setCustomSofaUpholsteryCosts((prev) => ({
                              ...prev,
                              [key]: baseValue,
                            }));
                            setUpholsteryCostsInput((prev) => ({
                              ...prev,
                              [key]: isNaN(val) ? "0.00" : val.toFixed(2),
                            }));
                          }}
                          className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${
                            errors[`customSofaUpholsteryCosts_${key}`]
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          min="0"
                        />
                        {errors[`customSofaUpholsteryCosts_${key}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors[`customSofaUpholsteryCosts_${key}`]}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="customSofaCushionCost"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Cushion Cost ({CURRENCY_SYMBOLS[currency]}/cushion)
                    </label>
                    <input
                      type="number"
                      id="customSofaCushionCost"
                      value={cushionCostInput}
                      onChange={(e) => setCushionCostInput(e.target.value)}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        const baseValue = isNaN(val)
                          ? 0
                          : val / CURRENCY_RATES[currency];
                        setCustomSofaCushionCost(baseValue);
                        setCushionCostInput(
                          isNaN(val) ? "0.00" : val.toFixed(2)
                        );
                      }}
                      className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${
                        errors.customSofaCushionCost
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      min="0"
                    />
                    {errors.customSofaCushionCost && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.customSofaCushionCost}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="customSofaLegSetCost"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Leg Set Cost ({CURRENCY_SYMBOLS[currency]}/set)
                    </label>
                    <input
                      type="number"
                      id="customSofaLegSetCost"
                      value={legSetCostInput}
                      onChange={(e) => setLegSetCostInput(e.target.value)}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        const baseValue = isNaN(val)
                          ? 0
                          : val / CURRENCY_RATES[currency];
                        setCustomSofaLegSetCost(baseValue);
                        setLegSetCostInput(
                          isNaN(val) ? "0.00" : val.toFixed(2)
                        );
                      }}
                      className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${
                        errors.customSofaLegSetCost
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      min="0"
                    />
                    {errors.customSofaLegSetCost && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.customSofaLegSetCost}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="customSofaArmCostPerPair"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Arm Cost ({CURRENCY_SYMBOLS[currency]}/pair)
                    </label>
                    <input
                      type="number"
                      id="customSofaArmCostPerPair"
                      value={armCostInput}
                      onChange={(e) => setArmCostInput(e.target.value)}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        const baseValue = isNaN(val)
                          ? 0
                          : val / CURRENCY_RATES[currency];
                        setCustomSofaArmCostPerPair(baseValue);
                        setArmCostInput(isNaN(val) ? "0.00" : val.toFixed(2));
                      }}
                      className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${
                        errors.customSofaArmCostPerPair
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      min="0"
                    />
                    {errors.customSofaArmCostPerPair && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.customSofaArmCostPerPair}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Results Section (Always visible) */}
          {(activeTab === "wardrobe" ||
            activeTab === "table" ||
            activeTab === "sofa") && (
            <section className="bg-green-50 p-6 rounded-lg shadow-inner">
              <h2 className="text-2xl font-semibold text-green-800 mb-6 flex items-center">
                <DollarSign className="w-6 h-6 mr-2" /> Estimated Costs
              </h2>
              <div className="space-y-3 text-lg">
                <div className="flex justify-between items-center py-2 border-b border-green-200">
                  <span className="font-medium text-gray-700">
                    Total Material Cost:
                  </span>
                  <span className="font-bold text-green-700">
                    {formatCurrency(totalMaterialCost)}
                  </span>
                </div>
                {/* Individual Material Costs */}
                {materialCost18mmDisplay > 0 && (
                  <div className="flex justify-between items-center py-1 pl-4 text-sm text-gray-600">
                    <span>
                      -{" "}
                      {materialType
                        .replace(/_/g, " ")
                        .split(" ")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}{" "}
                      18mm:
                    </span>
                    <span>{formatCurrency(materialCost18mmDisplay)}</span>
                  </div>
                )}
                {materialCost12mmDisplay > 0 && (
                  <div className="flex justify-between items-center py-1 pl-4 text-sm text-gray-600">
                    <span>
                      -{" "}
                      {materialType
                        .replace(/_/g, " ")
                        .split(" ")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}{" "}
                      12mm:
                    </span>
                    <span>{formatCurrency(materialCost12mmDisplay)}</span>
                  </div>
                )}
                {materialCost6mmDisplay > 0 && (
                  <div className="flex justify-between items-center py-1 pl-4 text-sm text-gray-600">
                    <span>
                      -{" "}
                      {materialType
                        .replace(/_/g, " ")
                        .split(" ")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}{" "}
                      6mm:
                    </span>
                    <span>{formatCurrency(materialCost6mmDisplay)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 border-b border-green-200">
                  <span className="font-medium text-gray-700">
                    Edge Banding Cost:
                  </span>
                  <span className="font-bold text-green-700">
                    {formatCurrency(totalEdgeBandingCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-green-200">
                  <span className="font-medium text-gray-700">
                    Hardware Cost:
                  </span>
                  <span className="font-bold text-green-700">
                    {formatCurrency(totalHardwareCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-green-200">
                  <span className="font-medium text-gray-700">
                    Estimated Labor Cost:
                  </span>
                  <span className="font-bold text-green-700">
                    {formatCurrency(estimatedLaborCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-green-200">
                  <span className="font-medium text-gray-700">
                    Additional Features Cost:
                  </span>
                  <span className="font-bold text-green-700">
                    {formatCurrency(additionalFeaturesCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b-2 border-green-400 font-bold text-xl text-green-900">
                  <span>Subtotal:</span>
                  <span>
                    {formatCurrency(
                      totalMaterialCost +
                        totalEdgeBandingCost +
                        totalHardwareCost +
                        estimatedLaborCost +
                        additionalFeaturesCost
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 font-bold text-2xl text-green-900">
                  <span className="flex items-center">
                    <Percent className="w-6 h-6 mr-2" /> Total Estimated Cost
                    (incl. {markupPercentage}% Markup):
                  </span>
                  <span className="text-green-900">
                    {formatCurrency(finalCost)}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Details Toggle (Only visible for furniture tabs) */}
          {(activeTab === "wardrobe" ||
            activeTab === "table" ||
            activeTab === "sofa") && (
            <div className="text-center">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-300 ease-in-out transform hover:scale-105"
              >
                {showDetails ? (
                  <>
                    Hide Details <ChevronUp className="ml-2 w-5 h-5" />
                  </>
                ) : (
                  <>
                    Show Details <ChevronDown className="ml-2 w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Detailed Breakdown (Conditional Rendering) */}
          {showDetails &&
            (activeTab === "wardrobe" ||
              activeTab === "table" ||
              activeTab === "sofa") && (
              <section className="bg-gray-50 p-6 rounded-lg shadow-inner mt-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                  <LayoutDashboard className="w-6 h-6 mr-2" /> Detailed
                  Breakdown
                </h2>
                <div className="space-y-4 text-gray-700">
                  {activeTab === "wardrobe" && (
                    <>
                      <p>
                        <strong>Wardrobe Dimensions:</strong> {height}" H x{" "}
                        {width}" W x {depth}" D
                      </p>
                      <p>
                        <strong>Number of Shelves:</strong> {numShelves}
                      </p>
                      <p>
                        <strong>Number of Drawers:</strong> {numDrawers}
                      </p>
                      {numDrawers > 0 && (
                        <>
                          <p>
                            <strong>Avg. Drawer Height:</strong> {drawerHeight}"
                          </p>
                          <p>
                            <strong>Avg. Drawer Depth:</strong> {drawerDepth}"
                          </p>
                        </>
                      )}
                      <p>
                        <strong>Number of Doors:</strong> {numDoors}
                      </p>
                      <p className="flex items-center">
                        <strong>Hanging Rod:</strong>{" "}
                        {hasHangingRod ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 ml-2" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 ml-2" />
                        )}
                      </p>
                      <p className="flex items-center">
                        <strong>Back Panel:</strong>{" "}
                        {hasBackPanel ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 ml-2" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 ml-2" />
                        )}
                      </p>
                      <p>
                        <strong>Hinge Type:</strong>{" "}
                        {hingeType
                          .replace(/_/g, " ")
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                      </p>
                      <p>
                        <strong>Drawer Slide Type:</strong>{" "}
                        {drawerSlideType
                          .replace(/_/g, " ")
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                      </p>
                      <p>
                        <strong>Handle Type:</strong>{" "}
                        {handleType
                          .replace(/_/g, " ")
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                      </p>
                      <p className="flex items-center">
                        <strong>Lighting:</strong>{" "}
                        {hasLighting ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 ml-2" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 ml-2" />
                        )}
                      </p>
                      <p className="flex items-center">
                        <strong>Glass Doors:</strong>{" "}
                        {hasGlassDoors ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 ml-2" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 ml-2" />
                        )}
                      </p>
                    </>
                  )}
                  {activeTab === "table" && (
                    <>
                      <p>
                        <strong>Table Dimensions:</strong> {tableLength}" L x{" "}
                        {tableWidth}" W x {tableHeight}" H
                      </p>
                      <p>
                        <strong>Hardware:</strong> Not applicable for this
                        simple table model.
                      </p>
                      <p>
                        <strong>Lighting:</strong> Not applicable for this
                        simple table model.
                      </p>
                      <p>
                        <strong>Glass Doors:</strong> Not applicable for this
                        simple table model.
                      </p>
                    </>
                  )}
                  {activeTab === "sofa" && (
                    <>
                      <p>
                        <strong>Sofa Dimensions:</strong> {sofaLength}" L x{" "}
                        {sofaDepth}" D x {sofaHeight}" H
                      </p>
                      <p>
                        <strong>Upholstery Type:</strong>{" "}
                        {upholsteryType
                          .replace(/_/g, " ")
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                      </p>
                      <p>
                        <strong>Number of Seat Cushions:</strong>{" "}
                        {numSeatCushions}
                      </p>
                      <p>
                        <strong>Number of Back Cushions:</strong>{" "}
                        {numBackCushions}
                      </p>
                      <p className="flex items-center">
                        <strong>Arms:</strong>{" "}
                        {hasArms ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 ml-2" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 ml-2" />
                        )}
                      </p>
                      <p>
                        <strong>Hardware:</strong> Not applicable for this
                        simple sofa model.
                      </p>
                      <p>
                        <strong>Lighting:</strong> Not applicable for this
                        simple sofa model.
                      </p>
                      <p>
                        <strong>Glass Doors:</strong> Not applicable for this
                        simple sofa model.
                      </p>
                    </>
                  )}
                  <p>
                    <strong>Main Material (Frame):</strong>{" "}
                    {materialType
                      .replace(/_/g, " ")
                      .split(" ")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(" ")}
                  </p>
                  <p>
                    <strong>Exterior Finish:</strong>{" "}
                    {finishType
                      .replace(/_/g, " ")
                      .split(" ")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(" ")}
                  </p>
                  <p>
                    <strong>Labor Cost Calculation:</strong> 70% of total
                    material cost.
                  </p>
                  <p>
                    <strong>Custom Markup:</strong> {markupPercentage}%
                  </p>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="text-xl font-medium text-gray-700 mb-2 flex items-center">
                      <Hammer className="w-5 h-5 mr-2" /> Assumptions & Notes:
                    </h3>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>
                        All base costs (materials, hardware, additional
                        features) are defined in US Dollars ($).
                      </li>
                      <li>
                        The final display currency is based on the selected
                        exchange rate.
                      </li>
                      <li>
                        Material thickness costs are applied based on component:
                        18mm for main panels/doors/drawer fronts, 12mm for
                        shelves/drawer boxes, 6mm for back panel.
                      </li>
                      <li>
                        Drawer dimensions ({drawerHeight}" H x {drawerDepth}" D)
                        are estimates for material calculation.
                      </li>
                      <li>
                        Costs do not include delivery, installation, or any
                        custom finishes unless specified.
                      </li>
                      <li>
                        All dimensions are in inches for input, converted to
                        feet for calculations.
                      </li>
                      <li>
                        Markup percentage is applied to the subtotal (materials
                        + hardware + labor + additional features).
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
            )}

          {/* Material Quantities Required Section (Only visible for furniture tabs) */}
          {showDetails &&
            (activeTab === "wardrobe" ||
              activeTab === "table" ||
              activeTab === "sofa") && (
              <section className="bg-gray-50 p-6 rounded-lg shadow-inner mt-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                  <Box className="w-6 h-6 mr-2" /> Material Quantities Required
                </h2>
                <div className="space-y-2 text-gray-700">
                  {materialArea18mmRequired > 0 && (
                    <p>
                      <strong>
                        {materialType
                          .replace(/_/g, " ")
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}{" "}
                        18mm:
                      </strong>{" "}
                      {materialArea18mmRequired.toFixed(2)} sq. ft.
                      {materialType === "plywood" &&
                        renderSheetDetails("18mm", plywoodSheets18mm)}
                    </p>
                  )}
                  {materialArea12mmRequired > 0 && (
                    <p>
                      <strong>
                        {materialType
                          .replace(/_/g, " ")
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}{" "}
                        12mm:
                      </strong>{" "}
                      {materialArea12mmRequired.toFixed(2)} sq. ft.
                      {materialType === "plywood" &&
                        renderSheetDetails("12mm", plywoodSheets12mm)}
                    </p>
                  )}
                  {materialArea6mmRequired > 0 && (
                    <p>
                      <strong>
                        {materialType
                          .replace(/_/g, " ")
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}{" "}
                        6mm:
                      </strong>{" "}
                      {materialArea6mmRequired.toFixed(2)} sq. ft.
                      {materialType === "plywood" &&
                        renderSheetDetails("6mm", plywoodSheets6mm)}
                    </p>
                  )}
                  {edgeBandingLengthRequired > 0 && (
                    <p>
                      <strong>Edge Banding:</strong>{" "}
                      {edgeBandingLengthRequired.toFixed(2)} linear ft.
                    </p>
                  )}
                  {upholsteryAreaRequired > 0 && (
                    <p>
                      <strong>
                        Upholstery Material (
                        {upholsteryType
                          .replace(/_/g, " ")
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                        ):
                      </strong>{" "}
                      {upholsteryAreaRequired.toFixed(2)} sq. ft.
                    </p>
                  )}
                  {numHingesRequired > 0 && (
                    <p>
                      <strong>
                        Hinges (
                        {hingeType
                          .replace(/_/g, " ")
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                        ):
                      </strong>{" "}
                      {numHingesRequired} units
                    </p>
                  )}
                  {numHandlesRequired > 0 && (
                    <p>
                      <strong>
                        Handles (
                        {handleType
                          .replace(/_/g, " ")
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                        ):
                      </strong>{" "}
                      {numHandlesRequired} units
                    </p>
                  )}
                  {lightingLengthRequired > 0 && (
                    <p>
                      <strong>Lighting:</strong>{" "}
                      {lightingLengthRequired.toFixed(2)} linear ft.
                    </p>
                  )}
                  {exteriorFinishAreaRequired > 0 && (
                    <p>
                      <strong>
                        Exterior Finish (
                        {finishType
                          .replace(/_/g, " ")
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                        ):
                      </strong>{" "}
                      {exteriorFinishAreaRequired.toFixed(2)} sq. ft.
                    </p>
                  )}
                  {numGlassDoorsRequired > 0 && (
                    <p>
                      <strong>Glass Doors:</strong> {numGlassDoorsRequired}{" "}
                      units
                    </p>
                  )}
                  {materialArea18mmRequired === 0 &&
                    materialArea12mmRequired === 0 &&
                    materialArea6mmRequired === 0 &&
                    edgeBandingLengthRequired === 0 &&
                    upholsteryAreaRequired === 0 &&
                    numHingesRequired === 0 &&
                    numHandlesRequired === 0 &&
                    lightingLengthRequired === 0 &&
                    exteriorFinishAreaRequired === 0 &&
                    numGlassDoorsRequired === 0 && (
                      <p className="text-sm text-gray-500">
                        No specific material quantities calculated for this
                        configuration.
                      </p>
                    )}
                </div>
              </section>
            )}
        </div>

        <footer className="bg-blue-600 text-white p-4 text-center text-sm rounded-b-xl">
          <p>
            &copy; {new Date().getFullYear()} Furniture Cost Estimator. All
            rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
