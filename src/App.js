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
} from "lucide-react";

// Define constants for material costs, hardware, and labor rates (BASE CURRENCY: USD)
const MATERIAL_COSTS_PER_SQFT = {
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

const EDGE_BANDING_COST_PER_LINEAR_FT = 0.5;

const HARDWARE_OPTIONS = {
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
  hanging_rod: 15.0, // Still a single type for simplicity
};

const LIGHTING_COST_PER_FT = 10.0; // Cost per linear foot of lighting
const GLASS_DOOR_ADDITIONAL_COST_PER_DOOR = 30.0; // Additional cost for glass per door

const FINISH_COSTS_PER_SQFT_EXTERIOR = {
  none: 0.0,
  paint: 2.5,
  veneer: 4.0,
  laminate: 3.0,
};

// New: Sofa specific constants
const SOFA_UPHOLSTERY_COSTS_PER_SQFT = {
  fabric: 3.0,
  leather: 10.0,
  velvet: 5.0,
};
const SOFA_CUSHION_COST_PER_CUSHION = 25.0;
const SOFA_LEG_SET_COST = 40.0; // Cost for a set of 4 legs
const SOFA_ARM_COST_PER_PAIR = 50.0; // Additional cost for arms

// New: Currency rates and symbols
const CURRENCY_RATES = {
  USD: 1.0, // Base currency
  INR: 83.5, // Example: 1 USD = 83.50 INR (adjust as needed)
};

const CURRENCY_SYMBOLS = {
  USD: "$",
  INR: "₹",
};

// Helper function to convert inches to feet
const inchesToFeet = (inches) => inches / 12;
const inchesToSqFeet = (inches) => inches / 144; // For area (inch^2 to ft^2)

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
  finishType,
  hasGlassDoors,
}) => {
  let materialArea18mm = 0;
  let materialArea12mm = 0;
  let materialArea6mm = 0;
  let edgeBandingLengthFt = 0;
  let hardwareCount = { hinge: 0, drawer_slide: 0, handle: 0, hanging_rod: 0 };
  let laborHours = 0;
  let featuresCost = 0; // This will accumulate costs not directly tied to material quantity (e.g., glass doors)

  const material18mmPrice = MATERIAL_COSTS_PER_SQFT[`${materialType}_18mm`];
  const material12mmPrice = MATERIAL_COSTS_PER_SQFT[`${materialType}_12mm`];
  const material6mmPrice = MATERIAL_COSTS_PER_SQFT[`${materialType}_6mm`];

  // Carcass panels: 2 sides, 1 top, 1 bottom (all 18mm)
  const sidesAreaSqIn = 2 * height * depth;
  const topBottomAreaSqIn = 2 * width * depth;
  materialArea18mm += inchesToSqFeet(sidesAreaSqIn + topBottomAreaSqIn);
  edgeBandingLengthFt += inchesToFeet(2 * height + 2 * width); // Front opening perimeter

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
  let doorAreaSqIn = 0;
  if (numDoors > 0) {
    const doorWidth = width / numDoors;
    doorAreaSqIn = numDoors * (doorWidth * height);
    materialArea18mm += inchesToSqFeet(doorAreaSqIn); // Add door material to 18mm
    edgeBandingLengthFt += inchesToFeet(
      numDoors * (2 * doorWidth + 2 * height)
    );
    hardwareCount.hinge += numDoors * 2;
    hardwareCount.handle += numDoors;

    if (hasGlassDoors) {
      featuresCost += numDoors * GLASS_DOOR_ADDITIONAL_COST_PER_DOOR;
    }
  }

  // Drawers - 12mm material for box, 18mm for front
  let drawerBoxAreaSqIn = 0;
  let drawerFrontAreaSqIn = 0;
  if (numDrawers > 0) {
    const avgDrawerWidth = width / (numDrawers > 0 ? numDrawers : 1);
    drawerBoxAreaSqIn =
      numDrawers *
      (2 * avgDrawerWidth * drawerHeight + // Front/Back of box
        2 * drawerDepth * drawerHeight + // Sides of box
        avgDrawerWidth * drawerDepth); // Bottom of box
    drawerFrontAreaSqIn = numDrawers * (avgDrawerWidth * drawerHeight); // Front panel
    materialArea12mm += inchesToSqFeet(drawerBoxAreaSqIn); // Add drawer box material to 12mm
    materialArea18mm += inchesToSqFeet(drawerFrontAreaSqIn); // Add drawer front material to 18mm

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

  laborHours = (height * width * depth) / 10000; // Base complexity factor
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
  }; // upholsteryAreaSqFt not applicable
};

// --- Table Calculation Logic (Simplified Example) ---
const calculateTableCosts = ({
  tableLength,
  tableWidth,
  tableHeight,
  materialType,
  finishType,
}) => {
  let materialArea18mm = 0;
  let materialArea12mm = 0;
  let materialArea6mm = 0;
  let edgeBandingLengthFt = 0;
  let hardwareCount = { hinge: 0, drawer_slide: 0, handle: 0, hanging_rod: 0 };
  let laborHours = 0;
  let featuresCost = 0;

  const material18mmPrice = MATERIAL_COSTS_PER_SQFT[`${materialType}_18mm`];

  // Tabletop - 18mm material
  const tabletopAreaSqIn = tableLength * tableWidth;
  materialArea18mm += inchesToSqFeet(tabletopAreaSqIn);
  edgeBandingLengthFt += inchesToFeet(2 * tableLength + 2 * tableWidth); // All 4 edges of tabletop

  // Legs/Frame - Simplified: 4 legs + perimeter frame. Assume 18mm material.
  const legHeight = tableHeight - 1; // Legs go up to just below tabletop
  const legMaterialLinearFt = 4 * inchesToFeet(legHeight); // 4 legs
  const framePerimeterFt = inchesToFeet(2 * tableLength + 2 * tableWidth);
  // Convert linear feet to equivalent square feet for 18mm material (e.g., assuming 3 inch wide strips)
  const equivalentSqFtForLegsFrame =
    (legMaterialLinearFt + framePerimeterFt) * (3 / 12); // Assuming 3-inch wide material for legs/frame
  materialArea18mm += equivalentSqFtForLegsFrame;

  // Labor for table (simpler than wardrobe)
  laborHours = (tableLength * tableWidth * tableHeight) / 50000; // Simpler complexity factor
  laborHours = Math.max(laborHours, 2); // Minimum 2 hours

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

// --- Sofa Calculation Logic (Simplified Example) ---
const calculateSofaCosts = ({
  sofaLength,
  sofaDepth,
  sofaHeight,
  materialType,
  upholsteryType,
  numSeatCushions,
  numBackCushions,
  hasArms,
}) => {
  let materialArea18mm = 0; // For frame
  let materialArea12mm = 0;
  let materialArea6mm = 0;
  let edgeBandingLengthFt = 0; // Not applicable for sofa
  let hardwareCount = { hinge: 0, drawer_slide: 0, handle: 0, hanging_rod: 0 }; // Not applicable for sofa
  let laborHours = 0;
  let featuresCost = 0; // For upholstery, cushions, legs, arms
  let upholsteryAreaSqFt = 0;

  const frameMaterialPrice = MATERIAL_COSTS_PER_SQFT[`${materialType}_18mm`];
  const upholsteryPricePerSqFt = SOFA_UPHOLSTERY_COSTS_PER_SQFT[upholsteryType];

  // Frame material (simplified: estimate based on overall volume/dimensions)
  const frameVolumeInches = sofaLength * sofaDepth * sofaHeight;
  // Convert volume to equivalent square feet of 18mm material (highly simplified)
  materialArea18mm += inchesToSqFeet(frameVolumeInches / 5); // Arbitrary division factor

  // Upholstery material (simplified: estimate surface area)
  // Top, front, back, sides of sofa
  const calculatedUpholsteryAreaSqIn =
    sofaLength * sofaHeight * 2 + // Front and back
    sofaDepth * sofaHeight * 2 + // Sides
    sofaLength * sofaDepth; // Top (seating area)
  upholsteryAreaSqFt = inchesToSqFeet(calculatedUpholsteryAreaSqIn);

  // Cushions
  featuresCost += numSeatCushions * SOFA_CUSHION_COST_PER_CUSHION;
  featuresCost += numBackCushions * SOFA_CUSHION_COST_PER_CUSHION;

  // Legs
  featuresCost += SOFA_LEG_SET_COST;

  // Arms
  if (hasArms) {
    featuresCost += SOFA_ARM_COST_PER_PAIR;
  }

  // Labor for sofa (simplified)
  laborHours = (sofaLength * sofaDepth * sofaHeight) / 15000; // Base complexity factor
  laborHours += numSeatCushions * 0.5; // Per cushion
  laborHours += numBackCushions * 0.5; // Per cushion
  laborHours += hasArms ? 1.5 : 0; // Additional labor for arms
  laborHours = Math.max(laborHours, 8); // Minimum 8 hours

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
  const [furnitureType, setFurnitureType] = useState("wardrobe"); // 'wardrobe', 'table', or 'sofa'

  // Sofa specific dimensions and features
  const [sofaLength, setSofaLength] = useState(80); // inches
  const [sofaDepth, setSofaDepth] = useState(36); // inches
  const [sofaHeight, setSofaHeight] = useState(30); // inches
  const [upholsteryType, setUpholsteryType] = useState("fabric");
  const [numSeatCushions, setNumSeatCushions] = useState(3);
  const [numBackCushions, setNumBackCushions] = useState(3);
  const [hasArms, setHasArms] = useState(true);

  // Table specific dimensions
  const [tableLength, setTableLength] = useState(48); // inches
  const [tableWidth, setTableWidth] = useState(24); // inches
  const [tableHeight, setTableHeight] = useState(30); // inches

  // Wardrobe specific states
  const [height, setHeight] = useState(72); // inches
  const [width, setWidth] = useState(36); // inches
  const [depth, setDepth] = useState(24); // inches
  const [numShelves, setNumShelves] = useState(2);
  const [numDrawers, setNumDrawers] = useState(0);
  const [hasHangingRod, setHasHangingRod] = useState(true);
  const [hasBackPanel, setHasBackPanel] = useState(true);
  const [numDoors, setNumDoors] = useState(2);
  const [drawerHeight, setDrawerHeight] = useState(8);
  const [drawerDepth, setDrawerDepth] = useState(20);

  // Common states
  const [materialType, setMaterialType] = useState("plywood");
  const [customLaborRate, setCustomLaborRate] = useState(30.0); // USD per hour
  const [customMarkupPercentage, setCustomMarkupPercentage] = useState(20);
  const [hingeType, setHingeType] = useState("standard");
  const [drawerSlideType, setDrawerSlideType] = useState("standard");
  const [handleType, setHandleType] = useState("basic");
  const [hasLighting, setHasLighting] = useState(false);
  const [finishType, setFinishType] = useState("none");
  const [hasGlassDoors, setHasGlassDoors] = useState(false);
  const [currency, setCurrency] = useState("INR");

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

  // New states for material quantities
  const [materialArea18mmRequired, setMaterialArea18mmRequired] = useState(0);
  const [materialArea12mmRequired, setMaterialArea12mmRequired] = useState(0);
  const [materialArea6mmRequired, setMaterialArea6mmRequired] = useState(0);
  const [edgeBandingLengthRequired, setEdgeBandingLengthRequired] = useState(0);
  const [upholsteryAreaRequired, setUpholsteryAreaRequired] = useState(0);

  // New states for specific quantities requested by user
  const [numHingesRequired, setNumHingesRequired] = useState(0);
  const [numHandlesRequired, setNumHandlesRequired] = useState(0);
  const [lightingLengthRequired, setLightingLengthRequired] = useState(0);
  const [exteriorFinishAreaRequired, setExteriorFinishAreaRequired] =
    useState(0);
  const [numGlassDoorsRequired, setNumGlassDoorsRequired] = useState(0);

  const [showDetails, setShowDetails] = useState(false);
  const [errors, setErrors] = useState({});

  // Validation function
  const validateInputs = () => {
    const newErrors = {};
    if (customLaborRate < 0) newErrors.customLaborRate = "Cannot be negative.";
    if (customMarkupPercentage < 0)
      newErrors.customMarkupPercentage = "Cannot be negative.";
    if (customMarkupPercentage > 100)
      newErrors.customMarkupPercentage = "Cannot exceed 100%.";

    if (furnitureType === "wardrobe") {
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
    } else if (furnitureType === "table") {
      if (tableLength <= 0) newErrors.tableLength = "Length must be positive.";
      if (tableWidth <= 0) newErrors.tableWidth = "Width must be positive.";
      if (tableHeight <= 0) newErrors.tableHeight = "Height must be positive.";
    } else if (furnitureType === "sofa") {
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
    if (validateInputs()) {
      performCalculations();
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
    furnitureType,
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
    customLaborRate,
    customMarkupPercentage,
    hingeType,
    drawerSlideType,
    handleType,
    hasLighting,
    finishType,
    hasGlassDoors,
    currency,
    tableLength,
    tableWidth,
    tableHeight, // Table dimensions
    sofaLength,
    sofaDepth,
    sofaHeight,
    upholsteryType,
    numSeatCushions,
    numBackCushions,
    hasArms, // Sofa dimensions/features
  ]);

  // Function to perform all calculations based on furniture type
  const performCalculations = () => {
    let calculatedResults;

    if (furnitureType === "wardrobe") {
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
        finishType,
        hasGlassDoors,
      });
    } else if (furnitureType === "table") {
      calculatedResults = calculateTableCosts({
        tableLength,
        tableWidth,
        tableHeight,
        materialType,
        finishType,
      });
      // For table, reset hardware and lighting/glass doors as they are not applicable in this simple model
      calculatedResults.hardwareCount = {
        hinge: 0,
        drawer_slide: 0,
        handle: 0,
        hanging_rod: 0,
      };
      calculatedResults.featuresCost = 0; // Reset features cost for table for now (finish is handled below)
    } else if (furnitureType === "sofa") {
      calculatedResults = calculateSofaCosts({
        sofaLength,
        sofaDepth,
        sofaHeight,
        materialType,
        upholsteryType,
        numSeatCushions,
        numBackCushions,
        hasArms,
      });
      // For sofa, reset hardware, edge banding, lighting, glass doors as they are not applicable in this simple model
      calculatedResults.edgeBandingLengthFt = 0;
      calculatedResults.hardwareCount = {
        hinge: 0,
        drawer_slide: 0,
        handle: 0,
        hanging_rod: 0,
      };
      // Note: featuresCost from calculateSofaCosts already includes upholstery, cushions, legs, arms
    }

    const {
      materialArea18mm,
      materialArea12mm,
      materialArea6mm,
      edgeBandingLengthFt,
      hardwareCount,
      laborHours,
      featuresCost,
      upholsteryAreaSqFt,
    } = calculatedResults;

    // Calculate material costs from areas
    const calculatedMaterialCost18mm =
      materialArea18mm * MATERIAL_COSTS_PER_SQFT[`${materialType}_18mm`];
    const calculatedMaterialCost12mm =
      materialArea12mm * MATERIAL_COSTS_PER_SQFT[`${materialType}_12mm`];
    const calculatedMaterialCost6mm =
      materialArea6mm * MATERIAL_COSTS_PER_SQFT[`${materialType}_6mm`];

    const calculatedTotalMaterialCost =
      calculatedMaterialCost18mm +
      calculatedMaterialCost12mm +
      calculatedMaterialCost6mm;

    const calculatedEdgeBandingCost =
      edgeBandingLengthFt * EDGE_BANDING_COST_PER_LINEAR_FT;

    let calculatedHardwareCost = 0;
    calculatedHardwareCost +=
      hardwareCount.hinge * (HARDWARE_OPTIONS.hinge[hingeType] || 0);
    calculatedHardwareCost +=
      hardwareCount.drawer_slide *
      (HARDWARE_OPTIONS.drawer_slide[drawerSlideType] || 0);
    calculatedHardwareCost +=
      hardwareCount.handle * (HARDWARE_OPTIONS.handle[handleType] || 0);
    calculatedHardwareCost +=
      hardwareCount.hanging_rod * (HARDWARE_OPTIONS.hanging_rod || 0);

    const calculatedLaborCost = laborHours * customLaborRate;

    let calculatedAdditionalFeaturesCost = featuresCost; // This now includes sofa-specific features too

    let currentLightingLength = 0;
    if (hasLighting && furnitureType === "wardrobe") {
      // Apply lighting only for wardrobe for now
      currentLightingLength = inchesToFeet(width);
      calculatedAdditionalFeaturesCost +=
        currentLightingLength * LIGHTING_COST_PER_FT;
    }

    let currentExteriorAreaSqFt = 0;
    if (finishType !== "none") {
      let exteriorAreaSqIn = 0;
      if (furnitureType === "wardrobe") {
        exteriorAreaSqIn = 2 * height * depth + width * height + width * depth;
      } else if (furnitureType === "table") {
        exteriorAreaSqIn =
          tableLength * tableWidth +
          2 * tableLength * tableHeight +
          2 * tableWidth * tableHeight; // Top + 4 sides
      } else if (furnitureType === "sofa") {
        // For sofa, finish might apply to exposed frame/legs. Very simplified estimate.
        exteriorAreaSqIn = sofaLength * sofaHeight + sofaDepth * sofaHeight; // Front and side exposed frame area
      }
      currentExteriorAreaSqFt = inchesToSqFeet(exteriorAreaSqIn);
      calculatedAdditionalFeaturesCost +=
        currentExteriorAreaSqFt * FINISH_COSTS_PER_SQFT_EXTERIOR[finishType];
    }

    let currentNumGlassDoors = 0;
    if (hasGlassDoors && furnitureType === "wardrobe") {
      currentNumGlassDoors = numDoors;
      // Glass doors cost is already handled within calculateWardrobeCosts for wardrobe (featuresCost)
    }

    const subTotalCost =
      calculatedTotalMaterialCost +
      calculatedEdgeBandingCost +
      calculatedHardwareCost +
      calculatedLaborCost +
      calculatedAdditionalFeaturesCost;
    const finalCalculatedCost =
      subTotalCost * (1 + customMarkupPercentage / 100);

    // Update state with calculated values
    setTotalMaterialCost(calculatedTotalMaterialCost);
    setMaterialCost18mmDisplay(calculatedMaterialCost18mm);
    setMaterialCost12mmDisplay(calculatedMaterialCost12mm);
    setMaterialCost6mmDisplay(calculatedMaterialCost6mm);
    setTotalEdgeBandingCost(calculatedEdgeBandingCost);
    setTotalHardwareCost(calculatedHardwareCost);
    setEstimatedLaborHours(laborHours);
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
  };

  // Helper to render input fields with error handling
  const renderInputField = (
    id,
    label,
    value,
    onChange,
    type = "number",
    min = 0,
    max = Infinity
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
          onChange(
            type === "number"
              ? Math.max(min, Math.min(max, parseFloat(e.target.value) || 0))
              : e.target.value
          )
        }
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
            onClick={() => setFurnitureType("wardrobe")}
            className={`flex-1 py-3 px-4 text-center rounded-lg font-medium transition-all duration-300 ease-in-out flex items-center justify-center space-x-2
                            ${
                              furnitureType === "wardrobe"
                                ? "tab-active"
                                : "text-gray-700 hover:bg-gray-200"
                            }`}
          >
            <Box className="w-5 h-5" /> <span>Wardrobe</span>
          </button>
          <button
            onClick={() => setFurnitureType("table")}
            className={`flex-1 py-3 px-4 text-center rounded-lg font-medium transition-all duration-300 ease-in-out flex items-center justify-center space-x-2
                            ${
                              furnitureType === "table"
                                ? "tab-active"
                                : "text-gray-700 hover:bg-gray-200"
                            }`}
          >
            <Table className="w-5 h-5" /> <span>Table</span>
          </button>
          <button
            onClick={() => setFurnitureType("sofa")}
            className={`flex-1 py-3 px-4 text-center rounded-lg font-medium transition-all duration-300 ease-in-out flex items-center justify-center space-x-2
                            ${
                              furnitureType === "sofa"
                                ? "tab-active"
                                : "text-gray-700 hover:bg-gray-200"
                            }`}
          >
            <Sofa className="w-5 h-5" /> <span>Sofa Set</span>
          </button>
          {/* Add more furniture types here */}
        </nav>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Input Section - Conditional Rendering based on furnitureType */}
          {furnitureType === "wardrobe" && (
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
          )}

          {furnitureType === "table" && (
            <section className="bg-blue-50 p-6 rounded-lg shadow-inner">
              <h2 className="text-2xl font-semibold text-blue-800 mb-6 flex items-center">
                <Ruler className="w-6 h-6 mr-2" /> Table Dimensions & Materials
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
          )}

          {furnitureType === "sofa" && (
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
                  SOFA_UPHOLSTERY_COSTS_PER_SQFT
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
          )}

          {/* Hardware Selection Section (only for wardrobe for now) */}
          {furnitureType === "wardrobe" && (
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
                  HARDWARE_OPTIONS.hinge
                )}
                {renderSelectField(
                  "drawerSlideType",
                  "Drawer Slide Type",
                  drawerSlideType,
                  setDrawerSlideType,
                  HARDWARE_OPTIONS.drawer_slide
                )}
                {renderSelectField(
                  "handleType",
                  "Handle Type",
                  handleType,
                  setHandleType,
                  HARDWARE_OPTIONS.handle
                )}
              </div>
            </section>
          )}

          {/* Additional Options Section (some apply to both, some conditionally) */}
          <section className="bg-yellow-50 p-6 rounded-lg shadow-inner">
            <h2 className="text-2xl font-semibold text-yellow-800 mb-6 flex items-center">
              <Lightbulb className="w-6 h-6 mr-2" /> Additional Options
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {furnitureType === "wardrobe" && (
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
              )}
              {renderSelectField(
                "finishType",
                "Exterior Finish",
                finishType,
                setFinishType,
                FINISH_COSTS_PER_SQFT_EXTERIOR
              )}
              {furnitureType === "wardrobe" && (
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
              )}
            </div>
          </section>

          {/* Custom Rates Section */}
          <section className="bg-indigo-50 p-6 rounded-lg shadow-inner">
            <h2 className="text-2xl font-semibold text-indigo-800 mb-6 flex items-center">
              <Percent className="w-6 h-6 mr-2" /> Custom Rates & Currency
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {renderInputField(
                "customLaborRate",
                `Labor Hourly Rate (${CURRENCY_SYMBOLS["USD"]}/hr)`,
                customLaborRate,
                setCustomLaborRate,
                "number",
                0
              )}
              {renderInputField(
                "customMarkupPercentage",
                "Markup Percentage (%)",
                customMarkupPercentage,
                setCustomMarkupPercentage,
                "number",
                0,
                100
              )}
              <div>
                <label
                  htmlFor="currency"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Currency
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-white"
                >
                  <option value="USD">US Dollar ($)</option>
                  <option value="INR">Indian Rupee (₹)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Results Section */}
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
                  Estimated Labor Hours:
                </span>
                <span className="font-bold text-green-700">
                  {estimatedLaborHours.toFixed(1)} hrs
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
                  (incl. {customMarkupPercentage}% Markup):
                </span>
                <span className="text-green-900">
                  {formatCurrency(finalCost)}
                </span>
              </div>
            </div>
          </section>

          {/* Details Toggle */}
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

          {/* Detailed Breakdown (Conditional Rendering) */}
          {showDetails && (
            <section className="bg-gray-50 p-6 rounded-lg shadow-inner mt-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                <LayoutDashboard className="w-6 h-6 mr-2" /> Detailed Breakdown
              </h2>
              <div className="space-y-4 text-gray-700">
                {furnitureType === "wardrobe" && (
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
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}
                    </p>
                    <p>
                      <strong>Drawer Slide Type:</strong>{" "}
                      {drawerSlideType
                        .replace(/_/g, " ")
                        .split(" ")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}
                    </p>
                    <p>
                      <strong>Handle Type:</strong>{" "}
                      {handleType
                        .replace(/_/g, " ")
                        .split(" ")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
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
                {furnitureType === "table" && (
                  <>
                    <p>
                      <strong>Table Dimensions:</strong> {tableLength}" L x{" "}
                      {tableWidth}" W x {tableHeight}" H
                    </p>
                    <p>
                      <strong>Hardware:</strong> Not applicable for this simple
                      table model.
                    </p>
                    <p>
                      <strong>Lighting:</strong> Not applicable for this simple
                      table model.
                    </p>
                    <p>
                      <strong>Glass Doors:</strong> Not applicable for this
                      simple table model.
                    </p>
                  </>
                )}
                {furnitureType === "sofa" && (
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
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
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
                      <strong>Hardware:</strong> Not applicable for this simple
                      sofa model.
                    </p>
                    <p>
                      <strong>Lighting:</strong> Not applicable for this simple
                      sofa model.
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
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                </p>
                <p>
                  <strong>Exterior Finish:</strong>{" "}
                  {finishType
                    .replace(/_/g, " ")
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                </p>
                <p>
                  <strong>Custom Labor Rate:</strong>{" "}
                  {formatCurrency(customLaborRate)}/hr (Base USD rate: $
                  {customLaborRate.toFixed(2)}/hr)
                </p>
                <p>
                  <strong>Custom Markup:</strong> {customMarkupPercentage}%
                </p>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-xl font-medium text-gray-700 mb-2 flex items-center">
                    <Hammer className="w-5 h-5 mr-2" /> Assumptions & Notes:
                  </h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>
                      All base costs (materials, hardware, additional features)
                      are defined in US Dollars ($).
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
                      Labor hours are estimated based on complexity and may
                      vary.
                    </li>
                    <li>
                      Costs do not include delivery, installation, or any custom
                      finishes unless specified.
                    </li>
                    <li>
                      All dimensions are in inches for input, converted to feet
                      for calculations.
                    </li>
                    <li>
                      Markup percentage is applied to the subtotal (materials +
                      hardware + labor + additional features).
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* New: Material Quantities Required Section */}
          {showDetails && (
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
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}{" "}
                      18mm:
                    </strong>{" "}
                    {materialArea18mmRequired.toFixed(2)} sq. ft.
                  </p>
                )}
                {materialArea12mmRequired > 0 && (
                  <p>
                    <strong>
                      {materialType
                        .replace(/_/g, " ")
                        .split(" ")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}{" "}
                      12mm:
                    </strong>{" "}
                    {materialArea12mmRequired.toFixed(2)} sq. ft.
                  </p>
                )}
                {materialArea6mmRequired > 0 && (
                  <p>
                    <strong>
                      {materialType
                        .replace(/_/g, " ")
                        .split(" ")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}{" "}
                      6mm:
                    </strong>{" "}
                    {materialArea6mmRequired.toFixed(2)} sq. ft.
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
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
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
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
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
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
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
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}
                      ):
                    </strong>{" "}
                    {exteriorFinishAreaRequired.toFixed(2)} sq. ft.
                  </p>
                )}
                {numGlassDoorsRequired > 0 && (
                  <p>
                    <strong>Glass Doors:</strong> {numGlassDoorsRequired} units
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
