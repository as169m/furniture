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

// Helper functions
const inchesToFeet = (inches) => inches / 12;
const inchesToSqFeet = (inches) => inches / 144;
const safeParseFloat = (val) => parseFloat(val) || 0;

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
  customMaterialCosts,
  customGlassDoorAddCost,
}) => {
  let materialArea18mm = 0;
  let materialArea12mm = 0;
  let materialArea6mm = 0;
  let edgeBandingLengthFt = 0;
  let hardwareCount = { hinge: 0, drawer_slide: 0, handle: 0, hanging_rod: 0 };
  let laborHours = 0;
  let featuresCost = 0;

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

  // Doors - 18mm material
  if (numDoors > 0) {
    const doorWidth = width / numDoors;
    materialArea18mm += inchesToSqFeet(numDoors * (doorWidth * height));
    edgeBandingLengthFt += inchesToFeet(
      numDoors * (2 * doorWidth + 2 * height)
    );
    hardwareCount.hinge += numDoors * 2;
    hardwareCount.handle += numDoors;
    featuresCost += numDoors * safeParseFloat(customGlassDoorAddCost);
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

  if (hasHangingRod) hardwareCount.hanging_rod += 1;

  laborHours =
    (height * width * depth) / 10000 +
    numShelves * 0.5 +
    numDrawers * 2.0 +
    numDoors * 1.0 +
    (hasHangingRod ? 0.2 : 0) +
    (hasBackPanel ? 0.5 : 0);
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
const calculateTableCosts = ({ tableLength, tableWidth, tableHeight }) => {
  let materialArea18mm = 0;
  let edgeBandingLengthFt = 0;

  const tabletopAreaSqIn = tableLength * tableWidth;
  materialArea18mm += inchesToSqFeet(tabletopAreaSqIn);
  edgeBandingLengthFt += inchesToFeet(2 * tableLength + 2 * tableWidth);

  const legHeight = tableHeight - 1;
  const legMaterialLinearFt = 4 * inchesToFeet(legHeight);
  const framePerimeterFt = inchesToFeet(2 * tableLength + 2 * tableWidth);
  materialArea18mm += (legMaterialLinearFt + framePerimeterFt) * (3 / 12);

  const laborHours = Math.max(
    (tableLength * tableWidth * tableHeight) / 50000,
    2
  );

  return {
    materialArea18mm,
    materialArea12mm: 0,
    materialArea6mm: 0,
    edgeBandingLengthFt,
    hardwareCount: { hinge: 0, drawer_slide: 0, handle: 0, hanging_rod: 0 },
    laborHours,
    featuresCost: 0,
    upholsteryAreaSqFt: 0,
  };
};

// --- Sofa Calculation Logic ---
const calculateSofaCosts = ({
  sofaLength,
  sofaDepth,
  sofaHeight,
  numSeatCushions,
  numBackCushions,
  hasArms,
  customSofaCushionCost,
  customSofaLegSetCost,
  customSofaArmCostPerPair,
}) => {
  const frameVolumeInches = sofaLength * sofaDepth * sofaHeight;
  const materialArea18mm = inchesToSqFeet(frameVolumeInches / 5);

  const upholsteryAreaSqFt = inchesToSqFeet(
    sofaLength * sofaHeight * 2 +
      sofaDepth * sofaHeight * 2 +
      sofaLength * sofaDepth
  );

  let featuresCost =
    (numSeatCushions + numBackCushions) *
      safeParseFloat(customSofaCushionCost) +
    safeParseFloat(customSofaLegSetCost);
  if (hasArms) featuresCost += safeParseFloat(customSofaArmCostPerPair);

  const laborHours = Math.max(
    (sofaLength * sofaDepth * sofaHeight) / 15000 +
      (numSeatCushions + numBackCushions) * 0.5 +
      (hasArms ? 1.5 : 0),
    8
  );

  return {
    materialArea18mm,
    materialArea12mm: 0,
    materialArea6mm: 0,
    edgeBandingLengthFt: 0,
    hardwareCount: { hinge: 0, drawer_slide: 0, handle: 0, hanging_rod: 0 },
    laborHours,
    featuresCost,
    upholsteryAreaSqFt,
  };
};

function App() {
  const [activeTab, setActiveTab] = useState("wardrobe");
  const [sofaLength, setSofaLength] = useState(80);
  const [sofaDepth, setSofaDepth] = useState(36);
  const [sofaHeight, setSofaHeight] = useState(30);
  const [upholsteryType, setUpholsteryType] = useState("fabric");
  const [numSeatCushions, setNumSeatCushions] = useState(3);
  const [numBackCushions, setNumBackCushions] = useState(3);
  const [hasArms, setHasArms] = useState(true);
  const [tableLength, setTableLength] = useState(48);
  const [tableWidth, setTableWidth] = useState(24);
  const [tableHeight, setTableHeight] = useState(30);
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
  const [materialType, setMaterialType] = useState("plywood");
  const [finishType, setFinishType] = useState("none");
  const [hingeType, setHingeType] = useState("standard");
  const [drawerSlideType, setDrawerSlideType] = useState("standard");
  const [handleType, setHandleType] = useState("basic");
  const [hasLighting, setHasLighting] = useState(false);
  const [hasGlassDoors, setHasGlassDoors] = useState(false);
  const [currency, setCurrency] = useState("INR");
  const [laborHourlyRate, setLaborHourlyRate] = useState(30.0);
  const [markupPercentage, setMarkupPercentage] = useState(20);
  const [customMaterialCosts, setCustomMaterialCosts] = useState({
    ...DEFAULT_MATERIAL_COSTS_PER_SQFT,
  });
  const [customEdgeBandingCost, setCustomEdgeBandingCost] = useState(
    DEFAULT_EDGE_BANDING_COST_PER_LINEAR_FT
  );
  const [customHardwareOptions, setCustomHardwareOptions] = useState(
    JSON.parse(JSON.stringify(DEFAULT_HARDWARE_OPTIONS))
  );
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
  const [showDetails, setShowDetails] = useState(false);
  const [errors, setErrors] = useState({});
  const [openSection, setOpenSection] = useState("labor_markup");

  useEffect(() => {
    try {
      const savedData = JSON.parse(
        localStorage.getItem("furnitureCalculatorRates")
      );
      if (savedData) {
        setLaborHourlyRate(savedData.laborHourlyRate);
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

  useEffect(() => {
    const ratesToSave = {
      laborHourlyRate,
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
    laborHourlyRate,
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

  const validateInputs = () => {
    const newErrors = {};
    if (safeParseFloat(laborHourlyRate) < 0)
      newErrors.laborHourlyRate = "Cannot be negative.";
    if (
      safeParseFloat(markupPercentage) < 0 ||
      safeParseFloat(markupPercentage) > 100
    )
      newErrors.markupPercentage = "Must be between 0-100.";
    if (activeTab === "wardrobe") {
      if (height <= 0) newErrors.height = "Must be positive.";
      if (width <= 0) newErrors.width = "Must be positive.";
      if (depth <= 0) newErrors.depth = "Must be positive.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (activeTab !== "rates_materials" && validateInputs()) {
      performCalculations();
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
    laborHourlyRate,
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

  const performCalculations = () => {
    const numericCustomCosts = {
      customMaterialCosts: Object.fromEntries(
        Object.entries(customMaterialCosts).map(([k, v]) => [
          k,
          safeParseFloat(v),
        ])
      ),
      customEdgeBandingCost: safeParseFloat(customEdgeBandingCost),
      customHardwareOptions: {
        ...customHardwareOptions,
        hinge: Object.fromEntries(
          Object.entries(customHardwareOptions.hinge).map(([k, v]) => [
            k,
            safeParseFloat(v),
          ])
        ),
        drawer_slide: Object.fromEntries(
          Object.entries(customHardwareOptions.drawer_slide).map(([k, v]) => [
            k,
            safeParseFloat(v),
          ])
        ),
        handle: Object.fromEntries(
          Object.entries(customHardwareOptions.handle).map(([k, v]) => [
            k,
            safeParseFloat(v),
          ])
        ),
        hanging_rod: safeParseFloat(customHardwareOptions.hanging_rod),
      },
      customLightingCostPerFt: safeParseFloat(customLightingCostPerFt),
      customGlassDoorAddCost: safeParseFloat(customGlassDoorAddCost),
      customFinishCosts: Object.fromEntries(
        Object.entries(customFinishCosts).map(([k, v]) => [
          k,
          safeParseFloat(v),
        ])
      ),
      customSofaUpholsteryCosts: Object.fromEntries(
        Object.entries(customSofaUpholsteryCosts).map(([k, v]) => [
          k,
          safeParseFloat(v),
        ])
      ),
      customSofaCushionCost: safeParseFloat(customSofaCushionCost),
      customSofaLegSetCost: safeParseFloat(customSofaLegSetCost),
      customSofaArmCostPerPair: safeParseFloat(customSofaArmCostPerPair),
    };

    let results;
    if (activeTab === "wardrobe")
      results = calculateWardrobeCosts({
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
        ...numericCustomCosts,
      });
    else if (activeTab === "table")
      results = calculateTableCosts({
        tableLength,
        tableWidth,
        tableHeight,
        ...numericCustomCosts,
      });
    else if (activeTab === "sofa")
      results = calculateSofaCosts({
        sofaLength,
        sofaDepth,
        sofaHeight,
        upholsteryType,
        numSeatCushions,
        numBackCushions,
        hasArms,
        ...numericCustomCosts,
      });
    else return;

    const {
      materialArea18mm,
      materialArea12mm,
      materialArea6mm,
      edgeBandingLengthFt,
      hardwareCount,
      laborHours,
      featuresCost,
      upholsteryAreaSqFt,
    } = results;

    const matCost18 =
      materialArea18mm *
      numericCustomCosts.customMaterialCosts[`${materialType}_18mm`];
    const matCost12 =
      materialArea12mm *
      numericCustomCosts.customMaterialCosts[`${materialType}_12mm`];
    const matCost6 =
      materialArea6mm *
      numericCustomCosts.customMaterialCosts[`${materialType}_6mm`];
    const totalMatCost = matCost18 + matCost12 + matCost6;

    const edgeCost =
      edgeBandingLengthFt * numericCustomCosts.customEdgeBandingCost;

    const hardwareCost =
      hardwareCount.hinge *
        (numericCustomCosts.customHardwareOptions.hinge[hingeType] || 0) +
      hardwareCount.drawer_slide *
        (numericCustomCosts.customHardwareOptions.drawer_slide[
          drawerSlideType
        ] || 0) +
      hardwareCount.handle *
        (numericCustomCosts.customHardwareOptions.handle[handleType] || 0) +
      hardwareCount.hanging_rod *
        (numericCustomCosts.customHardwareOptions.hanging_rod || 0);

    const laborCost = laborHours * safeParseFloat(laborHourlyRate);

    let additionalCost = featuresCost;
    let lightLen = 0;
    if (hasLighting && activeTab === "wardrobe") {
      lightLen = inchesToFeet(width);
      additionalCost += lightLen * numericCustomCosts.customLightingCostPerFt;
    }

    let exteriorArea = 0;
    if (finishType !== "none") {
      let areaSqIn = 0;
      if (activeTab === "wardrobe")
        areaSqIn = 2 * height * depth + width * height + width * depth;
      else if (activeTab === "table")
        areaSqIn =
          tableLength * tableWidth +
          2 * tableLength * tableHeight +
          2 * tableWidth * tableHeight;
      else if (activeTab === "sofa")
        areaSqIn = sofaLength * sofaHeight + sofaDepth * sofaHeight;
      exteriorArea = inchesToSqFeet(areaSqIn);
      additionalCost +=
        exteriorArea * numericCustomCosts.customFinishCosts[finishType];
    }

    const subTotal =
      totalMatCost + edgeCost + hardwareCost + laborCost + additionalCost;
    const final = subTotal * (1 + safeParseFloat(markupPercentage) / 100);

    setTotalMaterialCost(totalMatCost);
    setMaterialCost18mmDisplay(matCost18);
    setMaterialCost12mmDisplay(matCost12);
    setMaterialCost6mmDisplay(matCost6);
    setTotalEdgeBandingCost(edgeCost);
    setTotalHardwareCost(hardwareCost);
    setEstimatedLaborHours(laborHours);
    setEstimatedLaborCost(laborCost);
    setAdditionalFeaturesCost(additionalCost);
    setFinalCost(final);
    setMaterialArea18mmRequired(materialArea18mm);
    setMaterialArea12mmRequired(materialArea12mm);
    setMaterialArea6mmRequired(materialArea6mm);
    setEdgeBandingLengthRequired(edgeBandingLengthFt);
    setUpholsteryAreaRequired(upholsteryAreaSqFt);
    setNumHingesRequired(hardwareCount.hinge);
    setNumHandlesRequired(hardwareCount.handle);
    setLightingLengthRequired(lightLen);
    setExteriorFinishAreaRequired(exteriorArea);
    setNumGlassDoorsRequired(
      hasGlassDoors && activeTab === "wardrobe" ? numDoors : 0
    );
  };

  const renderInputField = (
    id,
    label,
    value,
    onChange,
    type = "number",
    min = 0,
    max = Infinity,
    step = 1
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
        onChange={(e) =>
          onChange(e.target.value === "" ? "" : parseFloat(e.target.value))
        }
        onBlur={(e) => {
          const v = parseFloat(e.target.value);
          if (isNaN(v) || v < min) onChange(min);
        }}
        className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${
          errors[id] ? "border-red-500" : "border-gray-300"
        }`}
        min={min}
        max={max}
        step={step}
      />
      {errors[id] && <p className="text-red-500 text-xs mt-1">{errors[id]}</p>}
    </div>
  );

  const renderCurrencyField = (id, label, value, onChange, min = 0) => {
    const handleLocalChange = (e) => {
      if (/^\d*\.?\d*$/.test(e.target.value)) onChange(e.target.value);
    };
    const handleLocalBlur = (e) => {
      let v = parseFloat(e.target.value);
      if (isNaN(v) || v < min) v = min;
      onChange(v);
    };
    return (
      <div>
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
        <input
          type="text"
          inputMode="decimal"
          id={id}
          value={value}
          onChange={handleLocalChange}
          onBlur={handleLocalBlur}
          className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${
            errors[id] ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="0.00"
        />
        {errors[id] && (
          <p className="text-red-500 text-xs mt-1">{errors[id]}</p>
        )}
      </div>
    );
  };

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
            {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            {typeof val === "number" &&
              ` (${CURRENCY_SYMBOLS[currency]}${(
                val * CURRENCY_RATES[currency]
              ).toFixed(2)})`}
          </option>
        ))}
      </select>
    </div>
  );

  const renderToggle = (id, label, checked, onChange) => (
    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
      <label htmlFor={id} className="text-sm font-medium text-gray-800">
        {label}
      </label>
      <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
        />
        <label
          htmlFor={id}
          className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
        ></label>
      </div>
    </div>
  );

  const formatCurrency = (amount) =>
    `${CURRENCY_SYMBOLS[currency]}${(amount * CURRENCY_RATES[currency]).toFixed(
      2
    )}`;
  const handleCostChange = (setter, key) => (value) =>
    setter((prev) => ({ ...prev, [key]: value }));
  const handleHardwareChange = (type, item) => (value) =>
    setCustomHardwareOptions((prev) => ({
      ...prev,
      [type]: { ...prev[type], [item]: value },
    }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 font-sans text-gray-800 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden">
        <header className="bg-blue-600 text-white p-6 flex items-center justify-center rounded-t-xl">
          <LayoutDashboard className="w-8 h-8 mr-3" />
          <h1 className="text-3xl font-bold text-center">
            Furniture Cost Estimator
          </h1>
        </header>

        <nav className="flex bg-gray-100 p-2 rounded-b-lg shadow-inner">
          {["wardrobe", "table", "sofa", "rates_materials"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 text-center rounded-lg font-medium transition-all duration-300 ease-in-out flex items-center justify-center space-x-2 ${
                activeTab === tab
                  ? "bg-blue-500 text-white shadow"
                  : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab === "wardrobe" && <Box className="w-5 h-5" />}
              {tab === "table" && <Table className="w-5 h-5" />}
              {tab === "sofa" && <Sofa className="w-5 h-5" />}
              {tab === "rates_materials" && <Settings className="w-5 h-5" />}
              <span>
                {tab
                  .replace("_", " & ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
            </button>
          ))}
        </nav>

        <main className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              {activeTab === "wardrobe" && (
                <div className="space-y-6">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">Dimensions (inches)</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {renderInputField("height", "Height", height, setHeight)}
                      {renderInputField("width", "Width", width, setWidth)}
                      {renderInputField("depth", "Depth", depth, setDepth)}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">
                      Internal Configuration
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {renderInputField(
                        "numShelves",
                        "# Shelves",
                        numShelves,
                        setNumShelves
                      )}
                      {renderInputField(
                        "numDrawers",
                        "# Drawers",
                        numDrawers,
                        setNumDrawers
                      )}
                      {renderInputField(
                        "numDoors",
                        "# Doors",
                        numDoors,
                        setNumDoors
                      )}
                      {numDrawers > 0 &&
                        renderInputField(
                          "drawerHeight",
                          "Drawer Height",
                          drawerHeight,
                          setDrawerHeight
                        )}
                      {numDrawers > 0 &&
                        renderInputField(
                          "drawerDepth",
                          "Drawer Depth",
                          drawerDepth,
                          setDrawerDepth
                        )}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">Materials & Hardware</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {renderSelectField(
                        "materialType",
                        "Material",
                        materialType,
                        setMaterialType,
                        DEFAULT_MATERIAL_COSTS_PER_SQFT
                      )}
                      {renderSelectField(
                        "finishType",
                        "Finish",
                        finishType,
                        setFinishType,
                        customFinishCosts
                      )}
                      {renderSelectField(
                        "hingeType",
                        "Hinges",
                        hingeType,
                        setHingeType,
                        customHardwareOptions.hinge
                      )}
                      {renderSelectField(
                        "drawerSlideType",
                        "Drawer Slides",
                        drawerSlideType,
                        setDrawerSlideType,
                        customHardwareOptions.drawer_slide
                      )}
                      {renderSelectField(
                        "handleType",
                        "Handles",
                        handleType,
                        setHandleType,
                        customHardwareOptions.handle
                      )}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">Features</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {renderToggle(
                        "hasHangingRod",
                        "Hanging Rod",
                        hasHangingRod,
                        setHasHangingRod
                      )}
                      {renderToggle(
                        "hasBackPanel",
                        "Back Panel",
                        hasBackPanel,
                        setHasBackPanel
                      )}
                      {renderToggle(
                        "hasLighting",
                        "LED Lighting",
                        hasLighting,
                        setHasLighting
                      )}
                      {renderToggle(
                        "hasGlassDoors",
                        "Glass Doors",
                        hasGlassDoors,
                        setHasGlassDoors
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "table" && (
                <div className="space-y-6">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">Dimensions (inches)</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {renderInputField(
                        "tableLength",
                        "Length",
                        tableLength,
                        setTableLength
                      )}
                      {renderInputField(
                        "tableWidth",
                        "Width",
                        tableWidth,
                        setTableWidth
                      )}
                      {renderInputField(
                        "tableHeight",
                        "Height",
                        tableHeight,
                        setTableHeight
                      )}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">Material & Finish</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {renderSelectField(
                        "materialType",
                        "Material",
                        materialType,
                        setMaterialType,
                        DEFAULT_MATERIAL_COSTS_PER_SQFT
                      )}
                      {renderSelectField(
                        "finishType",
                        "Finish",
                        finishType,
                        setFinishType,
                        customFinishCosts
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "sofa" && (
                <div className="space-y-6">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">Dimensions (inches)</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {renderInputField(
                        "sofaLength",
                        "Length",
                        sofaLength,
                        setSofaLength
                      )}
                      {renderInputField(
                        "sofaDepth",
                        "Depth",
                        sofaDepth,
                        setSofaDepth
                      )}
                      {renderInputField(
                        "sofaHeight",
                        "Height",
                        sofaHeight,
                        setSofaHeight
                      )}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">Configuration</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {renderInputField(
                        "numSeatCushions",
                        "# Seat Cushions",
                        numSeatCushions,
                        setNumSeatCushions
                      )}
                      {renderInputField(
                        "numBackCushions",
                        "# Back Cushions",
                        numBackCushions,
                        setNumBackCushions
                      )}
                      {renderToggle("hasArms", "Has Arms", hasArms, setHasArms)}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">Materials</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {renderSelectField(
                        "materialType",
                        "Frame Material",
                        materialType,
                        setMaterialType,
                        DEFAULT_MATERIAL_COSTS_PER_SQFT
                      )}
                      {renderSelectField(
                        "upholsteryType",
                        "Upholstery",
                        upholsteryType,
                        setUpholsteryType,
                        customSofaUpholsteryCosts
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "rates_materials" && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">
                      Customize Costs & Rates
                    </h2>
                    {renderSelectField(
                      "currency",
                      "Currency",
                      currency,
                      setCurrency,
                      CURRENCY_SYMBOLS
                    )}
                  </div>
                  <div className="space-y-4">
                    {[
                      {
                        key: "labor_markup",
                        title: "Labor & Markup",
                        content: (
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t">
                            {renderCurrencyField(
                              "laborHourlyRate",
                              `Labor Rate / hour (${CURRENCY_SYMBOLS[currency]})`,
                              laborHourlyRate,
                              setLaborHourlyRate
                            )}
                            {renderCurrencyField(
                              "markupPercentage",
                              "Markup (%)",
                              markupPercentage,
                              setMarkupPercentage,
                              0,
                              100
                            )}
                          </div>
                        ),
                      },
                      {
                        key: "materials",
                        title: "Sheet Materials & Edging",
                        content: (
                          <div className="p-4 border-t">
                            <h4 className="font-medium mb-2 text-gray-600">
                              Cost per sq. ft. ({CURRENCY_SYMBOLS[currency]})
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {Object.keys(DEFAULT_MATERIAL_COSTS_PER_SQFT).map(
                                (key) =>
                                  renderCurrencyField(
                                    key,
                                    key.replace(/_/g, " "),
                                    customMaterialCosts[key],
                                    handleCostChange(
                                      setCustomMaterialCosts,
                                      key
                                    )
                                  )
                              )}
                              {renderCurrencyField(
                                "customEdgeBandingCost",
                                `Edge Banding / ft`,
                                customEdgeBandingCost,
                                setCustomEdgeBandingCost
                              )}
                            </div>
                          </div>
                        ),
                      },
                      {
                        key: "hardware",
                        title: "Hardware",
                        content: (
                          <div className="p-4 border-t space-y-4">
                            <div>
                              <h4 className="font-medium mb-2 text-gray-600">
                                Hinges (per item)
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {Object.keys(
                                  DEFAULT_HARDWARE_OPTIONS.hinge
                                ).map((key) =>
                                  renderCurrencyField(
                                    `hinge_${key}`,
                                    key,
                                    customHardwareOptions.hinge[key],
                                    handleHardwareChange("hinge", key)
                                  )
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2 text-gray-600">
                                Drawer Slides (per pair)
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {Object.keys(
                                  DEFAULT_HARDWARE_OPTIONS.drawer_slide
                                ).map((key) =>
                                  renderCurrencyField(
                                    `drawer_slide_${key}`,
                                    key,
                                    customHardwareOptions.drawer_slide[key],
                                    handleHardwareChange("drawer_slide", key)
                                  )
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2 text-gray-600">
                                Handles (per item)
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {Object.keys(
                                  DEFAULT_HARDWARE_OPTIONS.handle
                                ).map((key) =>
                                  renderCurrencyField(
                                    `handle_${key}`,
                                    key,
                                    customHardwareOptions.handle[key],
                                    handleHardwareChange("handle", key)
                                  )
                                )}
                              </div>
                            </div>
                            {renderCurrencyField(
                              `hanging_rod`,
                              "Hanging Rod (per item)",
                              customHardwareOptions.hanging_rod,
                              (val) =>
                                setCustomHardwareOptions((p) => ({
                                  ...p,
                                  hanging_rod: val,
                                }))
                            )}
                          </div>
                        ),
                      },
                      {
                        key: "features",
                        title: "Finishes & Features",
                        content: (
                          <div className="p-4 border-t space-y-4">
                            <h4 className="font-medium mb-2 text-gray-600">
                              Exterior Finishes (per sq. ft.)
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {Object.keys(
                                DEFAULT_FINISH_COSTS_PER_SQFT_EXTERIOR
                              )
                                .filter((k) => k !== "none")
                                .map((key) =>
                                  renderCurrencyField(
                                    key,
                                    key,
                                    customFinishCosts[key],
                                    handleCostChange(setCustomFinishCosts, key)
                                  )
                                )}
                            </div>
                            <h4 className="font-medium mb-2 pt-4 text-gray-600">
                              Other Features
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {renderCurrencyField(
                                "customLightingCostPerFt",
                                "Lighting (per ft)",
                                customLightingCostPerFt,
                                setCustomLightingCostPerFt
                              )}
                              {renderCurrencyField(
                                "customGlassDoorAddCost",
                                "Glass Door (per door)",
                                customGlassDoorAddCost,
                                setCustomGlassDoorAddCost
                              )}
                            </div>
                          </div>
                        ),
                      },
                      {
                        key: "sofa_costs",
                        title: "Sofa Specific Costs",
                        content: (
                          <div className="p-4 border-t space-y-4">
                            <h4 className="font-medium mb-2 text-gray-600">
                              Upholstery (per sq. ft.)
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {Object.keys(
                                DEFAULT_SOFA_UPHOLSTERY_COSTS_PER_SQFT
                              ).map((key) =>
                                renderCurrencyField(
                                  key,
                                  key,
                                  customSofaUpholsteryCosts[key],
                                  handleCostChange(
                                    setCustomSofaUpholsteryCosts,
                                    key
                                  )
                                )
                              )}
                            </div>
                            <h4 className="font-medium mb-2 pt-4 text-gray-600">
                              Components
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {renderCurrencyField(
                                "customSofaCushionCost",
                                "Cushion (per item)",
                                customSofaCushionCost,
                                setCustomSofaCushionCost
                              )}
                              {renderCurrencyField(
                                "customSofaLegSetCost",
                                "Legs (per set)",
                                customSofaLegSetCost,
                                setCustomSofaLegSetCost
                              )}
                              {renderCurrencyField(
                                "customSofaArmCostPerPair",
                                "Arms (per pair)",
                                customSofaArmCostPerPair,
                                setCustomSofaArmCostPerPair
                              )}
                            </div>
                          </div>
                        ),
                      },
                    ].map(({ key, title, content }) => (
                      <div key={key} className="border rounded-lg">
                        <button
                          onClick={() =>
                            setOpenSection(openSection === key ? null : key)
                          }
                          className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
                        >
                          <h3 className="font-semibold text-lg">{title}</h3>
                          {openSection === key ? (
                            <ChevronUp />
                          ) : (
                            <ChevronDown />
                          )}
                        </button>
                        {openSection === key && content}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {activeTab !== "rates_materials" && (
              <div className="bg-gray-50 p-6 rounded-lg sticky top-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Cost Summary
                </h2>
                <div className="bg-blue-100 text-blue-800 p-6 rounded-lg text-center mb-4">
                  <p className="text-lg">Estimated Final Cost</p>
                  <p className="text-5xl font-extrabold tracking-tight">
                    {formatCurrency(finalCost)}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-blue-600 font-semibold mb-4 w-full text-center"
                >
                  {showDetails ? "Hide Details" : "Show Details"}
                </button>
                {showDetails && (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">Cost Breakdown</h3>
                      <ul className="space-y-1 text-sm">
                        <li className="flex justify-between">
                          <span>Material Cost:</span>{" "}
                          <strong>{formatCurrency(totalMaterialCost)}</strong>
                        </li>
                        <li className="flex justify-between">
                          <span>Edge Banding:</span>{" "}
                          <strong>
                            {formatCurrency(totalEdgeBandingCost)}
                          </strong>
                        </li>
                        <li className="flex justify-between">
                          <span>Hardware Cost:</span>{" "}
                          <strong>{formatCurrency(totalHardwareCost)}</strong>
                        </li>
                        <li className="flex justify-between">
                          <span>
                            Labor Cost ({estimatedLaborHours.toFixed(1)} hrs):
                          </span>{" "}
                          <strong>{formatCurrency(estimatedLaborCost)}</strong>
                        </li>
                        <li className="flex justify-between">
                          <span>Features & Finishes:</span>{" "}
                          <strong>
                            {formatCurrency(additionalFeaturesCost)}
                          </strong>
                        </li>
                        <li className="flex justify-between border-t pt-1 mt-1">
                          <span>Subtotal:</span>{" "}
                          <strong>
                            {formatCurrency(
                              finalCost / (1 + markupPercentage / 100)
                            )}
                          </strong>
                        </li>
                        <li className="flex justify-between">
                          <span>Markup ({markupPercentage}%):</span>{" "}
                          <strong>
                            {formatCurrency(
                              finalCost -
                                finalCost / (1 + markupPercentage / 100)
                            )}
                          </strong>
                        </li>
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">
                        Quantities Required
                      </h3>
                      <ul className="space-y-1 text-sm">
                        {materialArea18mmRequired > 0 && (
                          <li className="flex justify-between">
                            <span>18mm Material:</span>{" "}
                            <strong>
                              {materialArea18mmRequired.toFixed(2)} sq.ft
                            </strong>
                          </li>
                        )}
                        {materialArea12mmRequired > 0 && (
                          <li className="flex justify-between">
                            <span>12mm Material:</span>{" "}
                            <strong>
                              {materialArea12mmRequired.toFixed(2)} sq.ft
                            </strong>
                          </li>
                        )}
                        {materialArea6mmRequired > 0 && (
                          <li className="flex justify-between">
                            <span>6mm Material:</span>{" "}
                            <strong>
                              {materialArea6mmRequired.toFixed(2)} sq.ft
                            </strong>
                          </li>
                        )}
                        {edgeBandingLengthRequired > 0 && (
                          <li className="flex justify-between">
                            <span>Edge Banding:</span>{" "}
                            <strong>
                              {edgeBandingLengthRequired.toFixed(2)} ft
                            </strong>
                          </li>
                        )}
                        {upholsteryAreaRequired > 0 && (
                          <li className="flex justify-between">
                            <span>Upholstery:</span>{" "}
                            <strong>
                              {upholsteryAreaRequired.toFixed(2)} sq.ft
                            </strong>
                          </li>
                        )}
                        {numHingesRequired > 0 && (
                          <li className="flex justify-between">
                            <span>Hinges:</span>{" "}
                            <strong>{numHingesRequired}</strong>
                          </li>
                        )}
                        {numHandlesRequired > 0 && (
                          <li className="flex justify-between">
                            <span>Handles:</span>{" "}
                            <strong>{numHandlesRequired}</strong>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
        <style jsx>{`
          .toggle-checkbox:checked {
            right: 0;
            border-color: #3b82f6; /* blue-500 */
          }
          .toggle-checkbox:checked + .toggle-label {
            background-color: #3b82f6; /* blue-500 */
          }
        `}</style>
      </div>
    </div>
  );
}

export default App;
