// Room item configuration: how each purchasable object is modelled and placed.
//  - type "slab": occupies a discrete floor cell on its own
//  - type "top":  sits on a floor cell, and on top of a slab item if the cell
//                 holds a surface provider (e.g. the table)
window.RoomConfig = {
  // world units of one slab cell on the floor grid
  cellSpacing: 2,
  // scene-wide scale of the floor grid group
  gridScale: 1 / 6,
  // height of the walkable slab surface
  slabTopY: 0.115,

  items: {
    table: {
      type: "slab",
      url: "models/table.glb",
      scale: 2,
      // model-space y of the object's resting base
      baseY: -0.279,
      // other items may be placed on top of this object
      providesSurface: true,
      // model-space height of the surface top above the object's base
      surfaceTopY: 0.275,
      decorate: null,
    },
    plant: {
      type: "top",
      url: "models/plant.glb",
      scale: 1,
      baseY: -0.952,
      providesSurface: false,
      decorate: null,
    },
    lamp: {
      type: "top",
      url: "models/lamp.glb",
      scale: 1,
      baseY: -0.951,
      providesSurface: false,
      decorate: "lampGlow",
    },
  },

  decorations: {
    lampGlow: {
      color: 0xffb46b,
      intensity: 1.2,
      distance: 6,
      yOffset: 0.5,
    },
  },
};
