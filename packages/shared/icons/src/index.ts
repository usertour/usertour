export * from './icon';
export * from './pricing';
export * from './remix-icon';
// Import presets to register common icons
// This must be imported after remix-icon to ensure registerIcons is available
import './remix-icon-presets';
