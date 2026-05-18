import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "../components/Modal";

const baseConfig = {
  show: true,
  text: "Mensaje de prueba",
  type: "success",
  showButton: true,
  handleClick: null,
};

describe("Modal", () => {
  it("renderiza el texto cuando show es true", () => {
    render(<Modal modalConfig={baseConfig} setModalConfig={() => {}} />);
    expect(screen.getByText("Mensaje de prueba")).toBeInTheDocument();
  });

  it("queda oculto (display:none) cuando show es false", () => {
    const { container } = render(
      <Modal modalConfig={{ ...baseConfig, show: false }} setModalConfig={() => {}} />,
    );
    expect(container.querySelector(".modalContainer")).toHaveStyle({ display: "none" });
  });

  it("muestra botón Aceptar cuando showButton=true y sin handleClick", () => {
    const setConfig = vi.fn();
    render(<Modal modalConfig={baseConfig} setModalConfig={setConfig} />);
    fireEvent.click(screen.getByText("Aceptar"));
    expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ show: false }));
  });

  it("no muestra ningún botón si showButton=false y sin handleClick", () => {
    render(
      <Modal modalConfig={{ ...baseConfig, showButton: false }} setModalConfig={() => {}} />,
    );
    expect(screen.queryByText("Aceptar")).toBeNull();
  });

  it("muestra Cancelar y Aceptar cuando handleClick está definido", () => {
    const handleClick = vi.fn();
    render(
      <Modal modalConfig={{ ...baseConfig, handleClick }} setModalConfig={() => {}} />,
    );
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
    expect(screen.getByText("Aceptar")).toBeInTheDocument();
  });

  it("ejecuta handleClick al pulsar Aceptar (con confirmación)", () => {
    const handleClick = vi.fn();
    const setConfig = vi.fn();
    render(
      <Modal modalConfig={{ ...baseConfig, handleClick }} setModalConfig={setConfig} />,
    );
    fireEvent.click(screen.getByText("Aceptar"));
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ show: false }));
  });

  it("Cancelar cierra el modal sin ejecutar handleClick", () => {
    const handleClick = vi.fn();
    const setConfig = vi.fn();
    render(
      <Modal modalConfig={{ ...baseConfig, handleClick }} setModalConfig={setConfig} />,
    );
    fireEvent.click(screen.getByText("Cancelar"));
    expect(handleClick).not.toHaveBeenCalled();
    expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ show: false }));
  });
});
