// Raising PDF input capacity does not raise the cost limits of raster/OCR jobs.
export const PDF_INPUT_PAGES=2000;
export const PDF_OUTPUT_PAGES=2000;
export function validatePdfPages(count){
  if(!Number.isInteger(count)||count<1)throw new Error('This PDF has no pages.');
  if(count>PDF_INPUT_PAGES){const error=new Error(`Please choose a PDF with ${PDF_INPUT_PAGES.toLocaleString('en-US')} pages or fewer. For larger books, split the file first.`);error.code='PDF_PAGE_LIMIT';throw error;}
}

export const IMAGE_EXPORT_PAGES=100;
export function validateRasterPages(tool,count){
  const limit=tool==='to-images'?IMAGE_EXPORT_PAGES:50;
  if(count>limit)throw new Error(`${tool==='to-images'?'PDF to Images':'This image-based tool'} supports up to ${limit} selected pages per operation. Enter a smaller page range.`);
}
