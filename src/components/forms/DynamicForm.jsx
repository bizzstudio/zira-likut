import { useContext, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { languageContext } from "../../App";
import { getFormSchema } from "@shared/forms/registry.js";
import { buildEmptyFormState } from "@shared/forms/buildEmptyFormState.js";
import { validateFormSubmission } from "@shared/forms/validateFormSubmission.js";
import { getWordString } from "../Language";
import SignaturePad from "./SignaturePad";
import { getAppScopeId } from "../../utils/sessionScope";

const BASE = import.meta.env.VITE_MAIN_SERVER_URL || "";

function buildPayload(schema, state, signatureDataUrl, melaketId) {
  const base = {
    formCode: schema.formCode,
    submittedAt: new Date().toISOString(),
    melaketId,
  };
  if (schema.layout === "matrix") {
    return {
      ...base,
      data: {
        matrix: state.matrix,
        inspectionDate: String(state.inspectionDate || "").trim(),
        signature: signatureDataUrl,
        signatureMime: "image/png",
      },
    };
  }
  const row = {};
  for (const [k, v] of Object.entries(state)) {
    row[k] = typeof v === "string" ? v.trim() : v;
  }
  const sigKey = schema.validation?.signatureFieldKey || "signature";
  row[sigKey] = signatureDataUrl;
  row.signatureMime = "image/png";
  if (schema.payload?.wrapDataAs?.entries === "singleRowArray") {
    return { ...base, data: { entries: [row] } };
  }
  return { ...base, data: row };
}

function HeaderBlock({ schema }) {
  const h = schema.header;
  if (!h) return null;
  return (
    <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
      <div className="text-start font-semibold">
        {(h.rightLines || []).map((line, i) =>
          typeof line === "string" ? (
            <span key={i}>
              {i > 0 && <br />}
              {line}
            </span>
          ) : (
            <span key={i}>
              <br />
              <span className="font-normal text-gray-700">{line.sub}</span>
            </span>
          )
        )}
      </div>
      <div className="flex-1 px-2 text-lg font-bold md:order-none">
        {schema.title}
      </div>
      <div className="text-start text-gray-700">
        {(h.metaLines || []).map((line, idx) => (
          <span key={idx}>
            {idx > 0 && <br />}
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}

function MatrixFormBody({
  schema,
  state,
  setState,
  signatureRef,
  signatureHint,
  signatureClearLabel,
}) {
  const { matrix, ...footerState } = state;
  const setFooter = (key, val) =>
    setState((prev) => ({ ...prev, [key]: val }));

  const toggle = (rowKey, colKey) => {
    setState((prev) => ({
      ...prev,
      matrix: {
        ...prev.matrix,
        [rowKey]: {
          ...prev.matrix[rowKey],
          [colKey]: !prev.matrix[rowKey][colKey],
        },
      },
    }));
  };

  const cols = schema.matrix.columns;
  const colCount = cols.length;

  return (
    <>
      {schema.instructions?.parts?.length > 0 && (
        <p className="mt-3 text-xs text-gray-600 md:text-sm">
          {schema.instructions.parts.map((p, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-2">|</span>}
              <strong>{p.bold}</strong>
              {p.text}
            </span>
          ))}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse border border-gray-400 text-xs md:text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="w-40 border border-gray-400 p-2 align-bottom font-semibold">
                {schema.matrix.cornerHeaderLabel}
              </th>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className="border border-gray-400 p-2 align-bottom font-semibold leading-tight"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schema.matrix.rows.map((row) => (
              <tr key={row.key}>
                <th className="border border-gray-400 bg-gray-50 p-2 text-start font-semibold leading-tight">
                  {row.label}
                </th>
                {cols.map((col) => (
                  <td
                    key={col.key}
                    className="border border-gray-400 p-1 text-center align-middle"
                  >
                    <input
                      type="checkbox"
                      className="h-5 w-5 cursor-pointer accent-mainColor"
                      checked={!!matrix[row.key]?.[col.key]}
                      onChange={() => toggle(row.key, col.key)}
                      aria-label={`${row.label} — ${col.label}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
            {(schema.footer?.rows || []).map((fRow, ri) => (
              <tr key={ri}>
                {fRow.cells.map((cell, ci) => {
                  if (cell.type === "date") {
                    return (
                      <td
                        key={ci}
                        className="border border-gray-400 p-2 align-top"
                      >
                        <span className="mb-1 block font-semibold">
                          {cell.label}
                        </span>
                        <input
                          type="date"
                          className="w-full max-w-[11rem] rounded border border-gray-300 px-2 py-1"
                          value={footerState[cell.key] || ""}
                          onChange={(e) => setFooter(cell.key, e.target.value)}
                        />
                      </td>
                    );
                  }
                  if (cell.type === "signature") {
                    const colSpan = cell.spanRest ? colCount : 1;
                    return (
                      <td
                        key={ci}
                        colSpan={colSpan}
                        className="border border-gray-400 p-2 align-top"
                      >
                        <span className="mb-1 block font-semibold">
                          {cell.label}
                        </span>
                        <p className="mb-2 text-xs text-gray-600">
                          {signatureHint}
                        </p>
                        <div className="w-full max-w-xl">
                          <SignaturePad ref={signatureRef} className="w-full" />
                        </div>
                        <button
                          type="button"
                          className="mt-2 rounded border border-gray-300 bg-gray-50 px-3 py-1 text-sm font-semibold hover:bg-gray-100"
                          onClick={() => signatureRef.current?.clear()}
                        >
                          {signatureClearLabel}
                        </button>
                      </td>
                    );
                  }
                  return null;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TableFormBody({
  schema,
  state,
  setState,
  signatureRef,
  signatureHint,
  signatureClearLabel,
  nameLabel,
}) {
  const update = (key, val) =>
    setState((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="overflow-x-auto">
      <table
        className={`w-full border-collapse border border-gray-400 text-xs md:text-sm ${schema.tableMinWidthClass || "min-w-[720px]"}`}
      >
        <thead>
          <tr className="bg-gray-100">
            {(schema.columns || []).map((col) => (
              <th
                key={col.key || col.label}
                className={`border border-gray-400 p-2 font-semibold leading-tight ${col.width ?? "min-w-[5.5rem]"}`}
                title={col.labelTitle || col.label}
              >
                {col.type === "group" ? col.label : col.labelShort || col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {(schema.columns || []).map((col) => {
              if (col.type === "group") {
                return (
                  <td
                    key={col.key}
                    className="border border-gray-400 p-2 align-top"
                  >
                    {(col.fields || []).map((f) => {
                      if (f.type === "text") {
                        return (
                          <div key={f.key} className="mb-2">
                            <label className="mb-1 block text-xs font-semibold">
                              {f.label === "שם" ? nameLabel : f.label}
                            </label>
                            <input
                              type="text"
                              className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                              value={state[f.key] || ""}
                              onChange={(e) => update(f.key, e.target.value)}
                              autoComplete="name"
                            />
                          </div>
                        );
                      }
                      if (f.type === "signature") {
                        return (
                          <div key={f.key}>
                            <p className="mb-2 text-xs text-gray-600">
                              {signatureHint}
                            </p>
                            <div className="w-full max-w-[220px]">
                              <SignaturePad
                                ref={signatureRef}
                                className="w-full"
                              />
                            </div>
                            <button
                              type="button"
                              className="mt-2 rounded border border-gray-300 bg-gray-50 px-3 py-1 text-sm font-semibold hover:bg-gray-100"
                              onClick={() => signatureRef.current?.clear()}
                            >
                              {signatureClearLabel}
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </td>
                );
              }
              if (col.type === "signature") {
                return (
                  <td
                    key={col.key}
                    className="border border-gray-400 p-2 align-top"
                  >
                    <span className="mb-1 block font-semibold">{col.label}</span>
                    <p className="mb-2 text-xs text-gray-600">{signatureHint}</p>
                    <div className="w-full max-w-xs">
                      <SignaturePad ref={signatureRef} className="w-full" />
                    </div>
                    <button
                      type="button"
                      className="mt-2 rounded border border-gray-300 bg-gray-50 px-3 py-1 text-sm font-semibold hover:bg-gray-100"
                      onClick={() => signatureRef.current?.clear()}
                    >
                      {signatureClearLabel}
                    </button>
                  </td>
                );
              }
              if (col.type === "date") {
                return (
                  <td
                    key={col.key}
                    className="border border-gray-400 p-1 align-top"
                  >
                    <input
                      type="date"
                      className="w-full min-w-0 rounded border border-gray-300 px-1 py-1 text-xs"
                      value={state[col.key] || ""}
                      onChange={(e) => update(col.key, e.target.value)}
                    />
                  </td>
                );
              }
              if (col.type === "time") {
                return (
                  <td
                    key={col.key}
                    className="border border-gray-400 p-1 align-top"
                  >
                    <input
                      type="time"
                      className="w-full min-w-0 rounded border border-gray-300 px-1 py-1 text-xs"
                      value={state[col.key] || ""}
                      onChange={(e) => update(col.key, e.target.value)}
                    />
                  </td>
                );
              }
              const rows = col.rows ?? 2;
              return (
                <td
                  key={col.key}
                  className="border border-gray-400 p-1 align-top"
                >
                  <textarea
                    rows={rows}
                    className="w-full min-w-0 resize-y rounded border border-gray-300 px-1 py-1 text-xs"
                    value={state[col.key] || ""}
                    onChange={(e) => update(col.key, e.target.value)}
                  />
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function DynamicForm({ formCode }) {
  const schema = useMemo(() => getFormSchema(formCode), [formCode]);
  const nav = useNavigate();
  const { language } = useContext(languageContext);
  const [state, setState] = useState(() =>
    buildEmptyFormState(getFormSchema(formCode))
  );
  const [saving, setSaving] = useState(false);
  const signatureRef = useRef(null);

  const saveLabel = useMemo(
    () => getWordString(language, "saveDigitalForm"),
    [language]
  );
  const savedOk = useMemo(
    () => getWordString(language, "digitalFormSaved"),
    [language]
  );
  const saveErr = useMemo(
    () => getWordString(language, "digitalFormSaveError"),
    [language]
  );
  const backLabel = useMemo(() => getWordString(language, "back"), [language]);
  const savingLabel = useMemo(
    () => getWordString(language, "savingDigitalForm"),
    [language]
  );
  const signatureHint = useMemo(
    () => getWordString(language, "signatureHint"),
    [language]
  );
  const signatureClearLabel = useMemo(
    () => getWordString(language, "signatureClear"),
    [language]
  );
  const nameLabel = useMemo(() => getWordString(language, "name"), [language]);

  const validationAlert = useMemo(() => {
    if (!schema) return "";
    if (schema.formCode === "T02")
      return getWordString(language, "formT02CompleteFields");
    if (schema.formCode === "T03")
      return getWordString(language, "formT03CompleteRows");
    return getWordString(language, "formT01RequiredDateSignature");
  }, [language, schema]);

  const handleSubmit = async () => {
    if (!schema) return;
    const sigEmpty = signatureRef.current?.isEmpty?.() ?? true;
    const check = validateFormSubmission(schema, state, sigEmpty);
    if (!check.ok) {
      alert(validationAlert);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      nav("/login");
      return;
    }
    const sig = signatureRef.current?.getDataURL() ?? "";
    setSaving(true);
    try {
      const payload = buildPayload(
        schema,
        state,
        sig,
        getAppScopeId() || null
      );
      await axios.post(`${BASE}/app/forms/submissions`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(savedOk);
      nav("/items");
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        saveErr;
      alert(typeof msg === "string" ? msg : saveErr);
    } finally {
      setSaving(false);
    }
  };

  if (!schema) {
    return (
      <div className="p-4" dir="rtl">
        טופס לא ידוע: {formCode}
      </div>
    );
  }

  const wrapClass =
    schema.layout === "matrix"
      ? "max-w-6xl"
      : "max-w-[120rem]";

  return (
    <div className="min-h-screen bg-gray-50 p-3 pb-24 text-gray-900" dir="rtl">
      <div
        className={`mx-auto rounded-lg border border-gray-200 bg-white p-3 shadow-sm ${wrapClass}`}
      >
        <header className="mb-4 border-b border-gray-200 pb-3 text-center text-sm leading-snug">
          <HeaderBlock schema={schema} />
          {schema.intro && (
            <p className="mt-3 text-start text-xs leading-relaxed text-gray-700 md:text-sm">
              {schema.intro}
            </p>
          )}
        </header>

        {schema.layout === "matrix" && (
          <MatrixFormBody
            schema={schema}
            state={state}
            setState={setState}
            signatureRef={signatureRef}
            signatureHint={signatureHint}
            signatureClearLabel={signatureClearLabel}
          />
        )}
        {schema.layout === "table" && (
          <TableFormBody
            schema={schema}
            state={state}
            setState={setState}
            signatureRef={signatureRef}
            signatureHint={signatureHint}
            signatureClearLabel={signatureClearLabel}
            nameLabel={nameLabel}
          />
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold hover:bg-gray-50"
            onClick={() => nav("/items")}
          >
            {backLabel}
          </button>
          <button
            type="button"
            disabled={saving}
            className="rounded-lg bg-mainColor px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
            onClick={handleSubmit}
          >
            {saving ? savingLabel : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
