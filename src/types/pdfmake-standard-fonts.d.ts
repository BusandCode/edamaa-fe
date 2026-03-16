declare module 'pdfmake/build/standard-fonts/Helvetica' {
  const fontContainer: {
    vfs: Record<string, unknown>;
    fonts: Record<string, unknown>;
  };

  export default fontContainer;
}
