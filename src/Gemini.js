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

function App() {
  // State for wardrobe dimensions
  const [height, setHeight] = useState(72); // inches
  const [width, setWidth] = useState(36); // inches
  const [depth, setDepth] = useState(24); // inches

  // State for features
  const [materialType, setMaterialType] = useState("plywood");
  const [numShelves, setNumShelves] = useState(2);
  const [numDrawers, setNumDrawers] = useState(0);
  const [hasHangingRod, setHasHangingRod] = useState(true);
  const [hasBackPanel, setHasBackPanel] = useState(true);
  const [numDoors, setNumDoors] = useState(2);
  const [drawerHeight, setDrawerHeight] = useState(8); // Default drawer height for estimation
  const [drawerDepth, setDrawerDepth] = useState(20); // Default drawer depth for estimation

  // New: Custom rates
  const [customLaborRate, setCustomLaborRate] = useState(30.0); // USD per hour
  const [customMarkupPercentage, setCustomMarkupPercentage] = useState(20); // Stored as 20 for 20%

  // New: Hardware types
  const [hingeType, setHingeType] = useState("standard");
  const [drawerSlideType, setDrawerSlideType] = useState("standard");
  const [handleType, setHandleType] = useState("basic");

  // New: Additional options
  const [hasLighting, setHasLighting] = useState(false);
  const [finishType, setFinishType] = useState("none");
  const [hasGlassDoors, setHasGlassDoors] = useState(false);

  // New: Currency selection - DEFAULTED TO INR
  const [currency, setCurrency] = useState("INR");

  // State for calculated results
  const [totalMaterialCost, setTotalMaterialCost] = useState(0);
  const [materialCost18mmDisplay, setMaterialCost18mmDisplay] = useState(0); // Individual material cost
  const [materialCost12mmDisplay, setMaterialCost12mmDisplay] = useState(0); // Individual material cost
  const [materialCost6mmDisplay, setMaterialCost6mmDisplay] = useState(0); // Individual material cost
  const [totalEdgeBandingCost, setTotalEdgeBandingCost] = useState(0);
  const [totalHardwareCost, setTotalHardwareCost] = useState(0);
  const [estimatedLaborHours, setEstimatedLaborHours] = useState(0);
  const [estimatedLaborCost, setEstimatedLaborCost] = useState(0);
  const [additionalFeaturesCost, setAdditionalFeaturesCost] = useState(0);
  const [finalCost, setFinalCost] = useState(0);

  // State for UI elements
  const [showDetails, setShowDetails] = useState(false); // To toggle detailed breakdown
  const [errors, setErrors] = useState({}); // For input validation errors

  // Validation function
  const validateInputs = () => {
    const newErrors = {};
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
    if (customLaborRate < 0) newErrors.customLaborRate = "Cannot be negative.";
    if (customMarkupPercentage < 0)
      newErrors.customMarkupPercentage = "Cannot be negative.";
    if (customMarkupPercentage > 100)
      newErrors.customMarkupPercentage = "Cannot exceed 100%.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Effect hook to recalculate costs whenever relevant state changes
  useEffect(() => {
    if (validateInputs()) {
      calculateCosts();
    } else {
      // Reset costs if inputs are invalid
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
    }
  }, [
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
    currency, // Added currency to dependencies
  ]);

  // Function to perform all calculations
  const calculateCosts = () => {
    let materialCost18mm = 0;
    let materialCost12mm = 0;
    let materialCost6mm = 0;
    let edgeBandingLengthFt = 0;
    let hardwareCount = {
      hinge: 0,
      drawer_slide: 0,
      handle: 0,
      hanging_rod: 0,
    };
    let laborHours = 0;
    let featuresCost = 0;

    // Convert dimensions to feet for area/length calculations
    const hFt = inchesToFeet(height);
    const wFt = inchesToFeet(width);
    const dFt = inchesToFeet(depth);

    // --- Material Area Calculation ---
    const material18mmPrice = MATERIAL_COSTS_PER_SQFT[`${materialType}_18mm`];
    const material12mmPrice = MATERIAL_COSTS_PER_SQFT[`${materialType}_12mm`];
    const material6mmPrice = MATERIAL_COSTS_PER_SQFT[`${materialType}_6mm`];

    // Carcass panels: 2 sides, 1 top, 1 bottom (all 18mm)
    // Sides: 2 * (height * depth)
    // Top/Bottom: 2 * (width * depth)
    const sidesAreaSqIn = 2 * height * depth;
    const topBottomAreaSqIn = 2 * width * depth;
    materialCost18mm +=
      inchesToSqFeet(sidesAreaSqIn + topBottomAreaSqIn) * material18mmPrice;
    // Edge banding for carcass: Front edges of 2 sides + front edge of top + front edge of bottom
    edgeBandingLengthFt += inchesToFeet(2 * height + 2 * width); // Front opening perimeter

    // Shelves - 12mm material
    const shelfAreaSqIn = numShelves * (width * (depth - 1)); // Subtracting a bit for typical shelf depth
    materialCost12mm += inchesToSqFeet(shelfAreaSqIn) * material12mmPrice;
    edgeBandingLengthFt += inchesToFeet(numShelves * width); // Front edge of each shelf

    // Back Panel - 6mm material
    if (hasBackPanel) {
      const backPanelAreaSqIn = width * height;
      materialCost6mm += inchesToSqFeet(backPanelAreaSqIn) * material6mmPrice;
    }

    // Doors - 18mm material (or adjust for glass)
    if (numDoors > 0) {
      const doorWidth = width / numDoors; // Assuming doors span the full width
      const doorAreaSqIn = numDoors * (doorWidth * height);
      materialCost18mm += inchesToSqFeet(doorAreaSqIn) * material18mmPrice; // Base material for doors
      edgeBandingLengthFt += inchesToFeet(
        numDoors * (2 * doorWidth + 2 * height)
      ); // All 4 edges of each door
      hardwareCount.hinge += numDoors * 2; // 2 hinges per door
      hardwareCount.handle += numDoors; // 1 handle per door

      if (hasGlassDoors) {
        featuresCost += numDoors * GLASS_DOOR_ADDITIONAL_COST_PER_DOOR;
      }
    }

    // Drawers - 12mm material for box, 18mm for front
    if (numDrawers > 0) {
      const avgDrawerWidth = width / (numDrawers > 0 ? numDrawers : 1);
      const drawerBoxAreaSqIn =
        numDrawers *
        (2 * avgDrawerWidth * drawerHeight + // Front/Back of box
          2 * drawerDepth * drawerHeight + // Sides of box
          avgDrawerWidth * drawerDepth); // Bottom of box
      const drawerFrontAreaSqIn = numDrawers * (avgDrawerWidth * drawerHeight); // Front panel
      materialCost12mm += inchesToSqFeet(drawerBoxAreaSqIn) * material12mmPrice;
      materialCost18mm +=
        inchesToSqFeet(drawerFrontAreaSqIn) * material18mmPrice;

      edgeBandingLengthFt += inchesToFeet(
        numDrawers * (2 * avgDrawerWidth + 2 * drawerHeight)
      ); // All 4 edges of drawer front
      hardwareCount.drawer_slide += numDrawers; // 1 pair of slides per drawer
      hardwareCount.handle += numDrawers; // 1 handle per drawer
    }

    // Hanging Rod
    if (hasHangingRod) {
      hardwareCount.hanging_rod += 1;
    }

    // --- Cost Calculation ---
    const calculatedTotalMaterialCost =
      materialCost18mm + materialCost12mm + materialCost6mm; // Sum of all material costs
    const calculatedEdgeBandingCost =
      edgeBandingLengthFt * EDGE_BANDING_COST_PER_LINEAR_FT;

    let calculatedHardwareCost = 0;
    calculatedHardwareCost +=
      hardwareCount.hinge * HARDWARE_OPTIONS.hinge[hingeType];
    calculatedHardwareCost +=
      hardwareCount.drawer_slide *
      HARDWARE_OPTIONS.drawer_slide[drawerSlideType];
    calculatedHardwareCost +=
      hardwareCount.handle * HARDWARE_OPTIONS.handle[handleType];
    calculatedHardwareCost +=
      hardwareCount.hanging_rod * HARDWARE_OPTIONS.hanging_rod;

    // --- Labor Hour Estimation (Simplified) ---
    laborHours = (height * width * depth) / 10000; // Base complexity factor
    laborHours += numShelves * 0.5; // 0.5 hours per shelf
    laborHours += numDrawers * 2.0; // 2 hours per drawer (more complex)
    laborHours += numDoors * 1.0; // 1 hour per door
    laborHours += hasHangingRod ? 0.2 : 0;
    laborHours += hasBackPanel ? 0.5 : 0;
    laborHours = Math.max(laborHours, 5); // Minimum 5 hours
    const calculatedLaborCost = laborHours * customLaborRate;

    // --- Additional Features Cost ---
    if (hasLighting) {
      featuresCost += inchesToFeet(width) * LIGHTING_COST_PER_FT; // Lighting along the width
    }
    if (finishType !== "none") {
      // Estimate exterior surface area: 2 sides + front (doors/drawers) + top
      const exteriorAreaSqIn =
        2 * height * depth + width * height + width * depth;
      featuresCost +=
        inchesToSqFeet(exteriorAreaSqIn) *
        FINISH_COSTS_PER_SQFT_EXTERIOR[finishType];
    }

    const subTotalCost =
      calculatedTotalMaterialCost +
      calculatedEdgeBandingCost +
      calculatedHardwareCost +
      calculatedLaborCost +
      featuresCost;
    const finalCalculatedCost =
      subTotalCost * (1 + customMarkupPercentage / 100);

    // Update state with calculated values
    setTotalMaterialCost(calculatedTotalMaterialCost); // This is the sum
    setMaterialCost18mmDisplay(materialCost18mm); // Individual costs
    setMaterialCost12mmDisplay(materialCost12mm);
    setMaterialCost6mmDisplay(materialCost6mm);
    setTotalEdgeBandingCost(calculatedEdgeBandingCost);
    setTotalHardwareCost(calculatedHardwareCost);
    setEstimatedLaborHours(laborHours);
    setEstimatedLaborCost(calculatedLaborCost);
    setAdditionalFeaturesCost(featuresCost);
    setFinalCost(finalCalculatedCost);
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
              ` (${CURRENCY_SYMBOLS["USD"]}${val.toFixed(2)})`}{" "}
            {/* Show USD base cost for options */}
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
            Wardrobe Cost Estimator
          </h1>
        </header>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Input Section */}
          <section className="bg-blue-50 p-6 rounded-lg shadow-inner">
            <h2 className="text-2xl font-semibold text-blue-800 mb-6 flex items-center">
              <Ruler className="w-6 h-6 mr-2" /> Dimensions & Materials
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

          {/* Hardware Selection Section */}
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

          {/* Additional Options Section */}
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
                FINISH_COSTS_PER_SQFT_EXTERIOR
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
                      .replace("_", " ")
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
                      .replace("_", " ")
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
                      .replace("_", " ")
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
                <p>
                  <strong>Wardrobe Dimensions:</strong> {height}" H x {width}" W
                  x {depth}" D
                </p>
                <p>
                  <strong>Main Material:</strong>{" "}
                  {materialType
                    .replace("_", " ")
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
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
                    .replace("_", " ")
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                </p>
                <p>
                  <strong>Drawer Slide Type:</strong>{" "}
                  {drawerSlideType
                    .replace("_", " ")
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                </p>
                <p>
                  <strong>Handle Type:</strong>{" "}
                  {handleType
                    .replace("_", " ")
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
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
                <p>
                  <strong>Exterior Finish:</strong>{" "}
                  {finishType
                    .replace("_", " ")
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                </p>
                <p className="flex items-center">
                  <strong>Glass Doors:</strong>{" "}
                  {hasGlassDoors ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 ml-2" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 ml-2" />
                  )}
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
