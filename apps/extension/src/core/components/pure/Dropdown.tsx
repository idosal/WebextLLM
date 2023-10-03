import { ChevronUpDownIcon } from "@heroicons/react/24/solid"
import {useEffect, useRef, useState} from "react"

export function Dropdown<T>({
                                styled = false,
                                children,
                                choices,
                                getLabel,
                                onSelect,
                                showArrows,
                                className
                            }: {
    styled?: boolean;
    children: React.ReactNode;
    choices: Readonly<T[]>;
    getLabel?: (choice: T) => string;
    onSelect: (choice: T) => void;
    showArrows: boolean;
    className?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const getLabelOrDefault =
        getLabel ||
        ((choice) => (typeof choice === "string" ? choice : JSON.stringify(choice)));
    const dropdownRef = useRef(null);

    // Close the dropdown when a click occurs outside of it
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div ref={dropdownRef}>
            <button
                disabled={choices.length < 2}
                type="button"
                className={
                    "inline-flex justify-center w-full rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 " +
                    (styled
                        ? "border shadow-sm text-amber-700 dark:text-white hover:bg-amber-200 hover:dark:bg-amber-700 border-amber-600 dark:border-amber-400 focus:ring-amber-500"
                        : "") + className
                }
                id="options-menu"
                aria-haspopup="true"
                aria-expanded="true"
                onClick={() => setIsOpen(!isOpen)}
            >
                {children}
                {showArrows && <ChevronUpDownIcon className="ml-2 h-5 w-5" />}
            </button>

            {isOpen && (
                <div
                    className="absolute overflow-y-scroll overflow-scroll 44 w-[300px] z-10 mt-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="options-menu"
                >
                    <div className="py-1 max-h-[200px]" role="none">
                        {choices.map((choice) => (
                            <button
                                key={getLabelOrDefault(choice)}
                                className="block text-left w-full px-4 py-2 pr-8 text-amber-700 hover:bg-indigo-100 hover:text-indigo-900 focus:outline-none focus:bg-indigo-100 focus:text-indigo-900"
                                role="menuitem"
                                onClick={() => {
                                    setIsOpen(false)
                                    onSelect(choice)
                                }}
                            >
                                {getLabelOrDefault(choice)}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
