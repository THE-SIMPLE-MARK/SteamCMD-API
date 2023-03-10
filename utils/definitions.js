export const workbenchSizes = {
  TRAIN_DEPOT: {
    dimensionX: 97,
    dimensionY: 21,
    dimensionZ: 17,
  },
  SMALL_DOCK: {
    dimensionX: 57,
    dimensionY: 27,
    dimensionZ: 27,
  },
  SMALL_HANGAR: {
    dimensionX: 71,
    dimensionY: 21,
    dimensionZ: 63,
  },
  MEDIUM_HANGAR: {
    dimensionX: 137,
    dimensionY: 37,
    dimensionZ: 143,
  },
  MEDIUM_DOCK: {
    dimensionX: 227,
    dimensionY: 43,
    dimensionZ: 79,
  },
  HUGE: {
    dimensionX: 9999,
    dimensionY: 9999,
    dimensionZ: 9999,
  },
}

export const illegalProperties = {
  "@_max_force_scalar": { min: 0, max: 1 },
  "@_gear_ratio": { min: 0, max: 5 },
  "@_input_velocity": { min: 0, max: 5 },
  "@_grip_factor": { min: 0, max: 1 },
  "@_stiffness_factor": { min: 0, max: 1 },
  "@_coal_fill": { min: 0, max: 1 },
  "@_throttle_min": { min: 0, max: 1 },
  "@_throttle_max": { min: 0, max: 1 },
  "@_max_force_scale": { min: 0, max: 1 },
  "@_rps_limit": { min: 0, max: 100 },
}
