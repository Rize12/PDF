const selectedFilesByTool = {
  merge: [],
  compress: [],
  convert: [],
  pdfword: []
};

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

async function mergePdfFiles(files, statusEl, progressEl) {
  try {
    if (statusEl) statusEl.textContent = "Lendo arquivos...";
    if (progressEl) progressEl.style.width = "10%";

    const { PDFDocument } = window.PDFLib;
    const mergedPdf = await PDFDocument.create();

    let pct = 10;
    const stepBy = files.length > 0 ? Math.floor(80 / files.length) : 80;

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const srcPdf = await PDFDocument.load(arrayBuffer);

      const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
      pages.forEach((p) => mergedPdf.addPage(p));

      pct += stepBy;
      if (progressEl) progressEl.style.width = Math.min(pct, 90) + "%";
    }

    if (statusEl) statusEl.textContent = "Gerando PDF final...";
    if (progressEl) progressEl.style.width = "95%";

    const mergedBytes = await mergedPdf.save();

    const blob = new Blob([mergedBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "pdf-merge.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    if (statusEl) statusEl.textContent = "PDF combinado baixado com sucesso.";
    if (progressEl) progressEl.style.width = "100%";
  } catch (err) {
    console.error(err);
    if (statusEl) statusEl.textContent = "Erro ao juntar PDFs.";
    if (progressEl) progressEl.style.width = "0%";
  }
}

async function compressPdfDemo(files, statusEl, progressEl) {
  try {
    const file = files[0];
    if (statusEl) statusEl.textContent = "Lendo PDF...";
    if (progressEl) progressEl.style.width = "10%";

    const { PDFDocument } = window.PDFLib;

    const arrayBuffer = await file.arrayBuffer();
    const srcPdf = await PDFDocument.load(arrayBuffer, {
      updateMetadata: false
    });

    if (statusEl) statusEl.textContent = "Regravando PDF (demo)...";
    if (progressEl) progressEl.style.width = "60%";

    const newBytes = await srcPdf.save();

    const blob = new Blob([newBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const baseName = file.name.replace(/\.[^.]+$/, "");
    const fileName = `${baseName}-compressed-demo.pdf`;

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    if (statusEl) {
      statusEl.textContent =
        "PDF regravado (demo). A redução de tamanho pode ser limitada.";
    }
    if (progressEl) progressEl.style.width = "100%";
  } catch (err) {
    console.error(err);
    if (statusEl) statusEl.textContent = "Erro na compressão demo.";
    if (progressEl) progressEl.style.width = "0%";
  }
}

async function convertImagesToPdf(files, statusEl, progressEl) {
  try {
    if (statusEl) statusEl.textContent = "Lendo imagens...";
    if (progressEl) progressEl.style.width = "10%";

    const { PDFDocument } = window.PDFLib;
    const pdfDoc = await PDFDocument.create();

    let pct = 10;
    const stepBy = files.length > 0 ? Math.floor(80 / files.length) : 80;

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const type = file.type.toLowerCase();

      let image;
      if (type.includes("png")) {
        image = await pdfDoc.embedPng(bytes);
      } else {
        image = await pdfDoc.embedJpg(bytes);
      }

      const { width, height } = image;
      const page = pdfDoc.addPage();

      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();

      const scale = Math.min(
        (pageWidth / width) * 0.9,
        (pageHeight / height) * 0.9
      );

      const imgWidth = width * scale;
      const imgHeight = height * scale;

      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      page.drawImage(image, {
        x,
        y,
        width: imgWidth,
        height: imgHeight
      });

      pct += stepBy;
      if (progressEl) progressEl.style.width = Math.min(pct, 90) + "%";
    }

    if (statusEl) statusEl.textContent = "Gerando PDF final...";
    if (progressEl) progressEl.style.width = "95%";

    const pdfBytes = await pdfDoc.save();

    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const first = files[0];
    let baseName = "imagens-para-pdf";
    if (first && first.name) {
      baseName = first.name.replace(/\.[^.]+$/, "");
    }
    const fileName = `${baseName}-pdf.pdf`;

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    if (statusEl) statusEl.textContent = "PDF gerado com sucesso.";
    if (progressEl) progressEl.style.width = "100%";
  } catch (err) {
    console.error(err);
    if (statusEl) statusEl.textContent = "Erro ao converter imagens.";
    if (progressEl) progressEl.style.width = "0%";
  }
}

function renderFileList(tool) {
  const list = document.querySelector(`[data-file-list="${tool}"]`);
  const status = document.querySelector(
    `[data-status][data-tool="${tool}"]`
  );
  const progress = document.querySelector(
    `[data-progress][data-tool="${tool}"]`
  );

  if (!list) return;

  list.innerHTML = "";

  const files = selectedFilesByTool[tool] || [];

  if (!files.length) {
    if (status) status.textContent = "Nenhum arquivo selecionado.";
    if (progress) progress.style.width = "0%";
    return;
  }

  files.forEach((file, index) => {
    const li = document.createElement("li");

    const left = document.createElement("span");
    left.textContent = file.name;

    const rightWrapper = document.createElement("span");
    rightWrapper.style.display = "inline-flex";
    rightWrapper.style.alignItems = "center";
    rightWrapper.style.gap = "0.35rem";

    const sizeStrong = document.createElement("strong");
    sizeStrong.textContent = formatBytes(file.size);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.title = "Remover arquivo";
    removeBtn.className = "file-remove-btn";
    removeBtn.addEventListener("click", () => {
      selectedFilesByTool[tool].splice(index, 1);
      renderFileList(tool);
    });

    rightWrapper.appendChild(sizeStrong);
    rightWrapper.appendChild(removeBtn);

    li.appendChild(left);
    li.appendChild(rightWrapper);
    list.appendChild(li);
  });

  if (status) {
    status.textContent = "Arquivos prontos para processamento.";
  }
  if (progress) {
    progress.style.width = "0%";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const fileInputs = document.querySelectorAll(".file-input");
  const runButtons = document.querySelectorAll("[data-run-demo]");

  fileInputs.forEach((input) => {
    input.addEventListener("change", () => {
      const tool = input.dataset.tool;
      const files = input.files;

      if (!tool) return;
      if (!files || files.length === 0) return;

      const current = selectedFilesByTool[tool] || [];
      selectedFilesByTool[tool] = current.concat(Array.from(files));

      renderFileList(tool);

      input.value = "";
    });
  });

  runButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tool = btn.dataset.tool;
      const status = document.querySelector(
        `[data-status][data-tool="${tool}"]`
      );
      const progress = document.querySelector(
        `[data-progress][data-tool="${tool}"]`
      );

      if (!status || !progress) return;

      const files = selectedFilesByTool[tool] || [];
      if (!files.length) {
        status.textContent =
          "Selecione ao menos um arquivo antes de continuar.";
        progress.style.width = "0%";
        return;
      }

      if (tool === "merge") {
        await mergePdfFiles(files, status, progress);
      } else if (tool === "compress") {
        await compressPdfDemo(files, status, progress);
      } else if (tool === "convert") {
        await convertImagesToPdf(files, status, progress);
      } else if (tool === "pdfword") {
        // DEMO: apenas simula processamento
        status.textContent =
          "Demo: aqui o PDF seria convertido para Word em um backend.";
        let pct = 10;
        progress.style.width = "10%";
        const step = setInterval(() => {
          pct += 20;
          if (pct >= 100) {
            pct = 100;
            clearInterval(step);
            status.textContent =
              "Conversão demo concluída. (Sem arquivo real gerado)";
          }
          progress.style.width = pct + "%";
        }, 150);
      }
    });
  });
});