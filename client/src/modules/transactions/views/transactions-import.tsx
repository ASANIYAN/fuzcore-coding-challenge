import { Link } from "react-router-dom";
import { CustomButton } from "@/components/custom/custom-button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/get-api-error-message";
import { useTransactionsImportView } from "@/modules/transactions/hooks/use-transactions-import-view";
import { useCurrencies } from "@/modules/currencies/hooks/use-currencies";

export default function TransactionsImportView() {
  const {
    selectedFile,
    jobId,
    status,
    importState,
    summary,
    isQueueing,
    isPolling,
    pollError,
    isDownloadingSample,
    formattedSelectedFileSize,
    changeFile,
    queue,
    downloadSampleFile,
  } = useTransactionsImportView();

  const { currencies, isLoading } = useCurrencies();

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xxiv font-semibold text-app-text">
          Import transactions
        </h1>
        <p className="text-xiii text-app-text-muted">
          Upload a CSV file and we&apos;ll process it. You can track progress
          below.
        </p>
      </header>

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <h2 className="mb-4 text-xvi font-semibold text-app-text">
          Upload CSV file
        </h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="transactions-csv"
              className="text-xiii font-medium text-app-text"
            >
              Select CSV file
            </label>
            <Input
              id="transactions-csv"
              type="file"
              accept=".csv,text/csv"
              onChange={changeFile}
              className="h-auto rounded-[--radius-md] border-app-border bg-app-card px-3 py-2 text-xiii text-app-text"
            />
            <p className="text-xii text-app-text-muted">Max file size: 2MB</p>
            {selectedFile ? (
              <p className="text-xii text-app-text-muted">
                Selected:{" "}
                <span className="text-app-text">{selectedFile.name}</span> (
                {formattedSelectedFileSize})
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <CustomButton
              type="button"
              loading={isQueueing}
              onClick={() => void queue()}
              disabled={!selectedFile}
            >
              Start import
            </CustomButton>
            <CustomButton
              type="button"
              variant="secondary"
              loading={isDownloadingSample}
              onClick={() => void downloadSampleFile()}
            >
              Download sample CSV
            </CustomButton>
            <Link
              to="/dashboard/transactions"
              className="text-xiii text-app-text hover:underline"
            >
              Back to transactions
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <h2 className="mb-4 text-xvi font-semibold text-app-text">
          Import status
        </h2>

        {!jobId ? (
          <p className="text-xiii text-app-text-muted">
            No active import yet. Upload a CSV and click "Start import" to
            begin.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[--radius-md] border border-app-border bg-app-surface p-3">
                <p className="text-xii text-app-text-muted">Job ID</p>
                <p className="break-all text-xiii text-app-text">{jobId}</p>
              </div>
              <div className="rounded-[--radius-md] border border-app-border bg-app-surface p-3">
                <p className="text-xii text-app-text-muted">State</p>
                <p className="capitalize text-xiii text-app-text">
                  {importState}
                </p>
                {isPolling ? (
                  <p className="mt-1 text-xii text-app-text-muted">
                    Refreshing...
                  </p>
                ) : null}
              </div>
            </div>

            {summary ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {summary.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[--radius-md] border border-app-border bg-app-surface p-3"
                  >
                    <p className="text-xii text-app-text-muted">{item.label}</p>
                    <p className="text-xvi font-semibold text-app-text">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {pollError ? (
              <p className="text-xii text-app-danger">
                {getApiErrorMessage(pollError, "Unable to fetch import status")}
              </p>
            ) : null}

            <div className="rounded-[--radius-md] border border-app-border bg-app-card">
              <div className="border-b border-app-border px-4 py-3">
                <h3 className="text-xiii font-medium text-app-text">
                  Row errors
                </h3>
              </div>
              {status?.errors?.length ? (
                <div className="max-h-72 overflow-y-auto">
                  <ul className="divide-y divide-app-border">
                    {status.errors.map((error, index) => (
                      <li
                        key={`${error.row}-${index}`}
                        className="px-4 py-3 text-xii"
                      >
                        <span className="font-medium text-app-text">
                          Row {error.row}:{" "}
                        </span>
                        <span className="text-app-text-muted">
                          {error.reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="px-4 py-4 text-xii text-app-text-muted">
                  {status
                    ? "No row-level errors found."
                    : "No import report yet."}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <h2 className="mb-2 text-xvi font-semibold text-app-text">
          CSV format guide
        </h2>
        <p className="text-xiii text-app-text-muted">
          Required header:
          <code className="ml-1 rounded bg-app-surface px-1 py-0.5 text-xii text-app-text">
            category,amount,currency,customerEmail,description,reference,transactionDate
          </code>
        </p>
        <div className="mt-4 overflow-x-auto rounded-[--radius-md] border border-app-border">
          <table className="w-full min-w-[760px] text-left text-xii">
            <thead className="border-b border-app-border bg-app-surface text-app-text-muted">
              <tr>
                <th className="px-3 py-2.5 font-medium">Field</th>
                <th className="px-3 py-2.5 font-medium">Required</th>
                <th className="px-3 py-2.5 font-medium">What it means</th>
                <th className="px-3 py-2.5 font-medium">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              <tr>
                <td className="px-3 py-2.5 font-medium text-app-text">
                  category
                </td>
                <td className="px-3 py-2.5 text-app-text">Yes</td>
                <td className="px-3 py-2.5 text-app-text-muted">
                  Combines transaction type and category name in{" "}
                  <code>type:name</code> format. Type must be{" "}
                  <code>income</code> or <code>expense</code>, and name must
                  match an existing category for your account.
                </td>
                <td className="px-3 py-2.5 text-app-text-muted">
                  <code>income:Consulting</code>
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2.5 font-medium text-app-text">
                  amount
                </td>
                <td className="px-3 py-2.5 text-app-text">Yes</td>
                <td className="px-3 py-2.5 text-app-text-muted">
                  Transaction value in normal currency units.
                </td>
                <td className="px-3 py-2.5 text-app-text-muted">
                  <code>1500.00</code>
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2.5 font-medium text-app-text">
                  currency
                </td>
                <td className="px-3 py-2.5 text-app-text">Yes</td>
                <td className="px-3 py-2.5 text-app-text-muted">
                  3-letter currency code supported by your workspace.
                </td>
                <td className="px-3 py-2.5 text-app-text-muted">
                  <code>USD</code>, <code>NGN</code>
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2.5 font-medium text-app-text">
                  customerEmail
                </td>
                <td className="px-3 py-2.5 text-app-text">No</td>
                <td className="px-3 py-2.5 text-app-text-muted">
                  It must match an existing customer email.
                </td>
                <td className="px-3 py-2.5 text-app-text-muted">
                  <code>billing@acme.com</code>
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2.5 font-medium text-app-text">
                  description
                </td>
                <td className="px-3 py-2.5 text-app-text">No</td>
                <td className="px-3 py-2.5 text-app-text-muted">
                  Optional transaction note.
                </td>
                <td className="px-3 py-2.5 text-app-text-muted">
                  <code>Consulting fee for March</code>
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2.5 font-medium text-app-text">
                  reference
                </td>
                <td className="px-3 py-2.5 text-app-text">No</td>
                <td className="px-3 py-2.5 text-app-text-muted">
                  Optional external reference or invoice identifier.
                </td>
                <td className="px-3 py-2.5 text-app-text-muted">
                  <code>INV-0001</code>
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2.5 font-medium text-app-text">
                  transactionDate
                </td>
                <td className="px-3 py-2.5 text-app-text">Yes</td>
                <td className="px-3 py-2.5 text-app-text-muted">
                  Date/time of the transaction. ISO format is recommended.
                </td>
                <td className="px-3 py-2.5 text-app-text-muted">
                  <code>2026-04-29T10:00:00.000Z</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xii text-app-text-muted">
          <li>
            <strong>category</strong> uses <code>type:name</code> format
            (example: <code>income:Consulting</code>).
          </li>
          <li>
            <strong>currency</strong> must match supported currencies{" "}
            {!isLoading &&
              `(${currencies.map((currency) => `${currency.code}`)})`}
            .
          </li>
          <li>
            <strong>customerEmail</strong> must map to an existing customer if
            provided.
          </li>
          <li>
            <strong>transactionDate</strong> should be a valid date (ISO format
            recommended).
          </li>
        </ul>
      </div>
    </section>
  );
}
