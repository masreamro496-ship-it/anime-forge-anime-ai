declare module "fabric/dist/fabric.min.js" {
  import type fabricNS from "fabric";
  const fabric: typeof fabricNS;
  export = fabric;
  export { fabric };
  export default fabric;
}
