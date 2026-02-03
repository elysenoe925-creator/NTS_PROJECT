import React, { useState } from 'react';
import { X, Delete, Command, Hash } from 'lucide-react';

export default function Calculator({ onClose }) {
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');
    const [isDone, setIsDone] = useState(false);

    const handleNumber = (num) => {
        if (isDone) {
            setDisplay(num);
            setIsDone(false);
        } else {
            setDisplay(display === '0' ? num : display + num);
        }
    };

    const handleOperator = (op) => {
        setEquation(display + ' ' + op + ' ');
        setDisplay('0');
        setIsDone(false);
    };

    const handleClear = () => {
        setDisplay('0');
        setEquation('');
        setIsDone(false);
    };

    const handleBackspace = () => {
        if (display.length > 1) {
            setDisplay(display.slice(0, -1));
        } else {
            setDisplay('0');
        }
    };

    const handleEqual = () => {
        try {
            const fullEquation = equation + display;
            // Using Function constructor as a safer alternative to eval for simple math
            const result = new Function(`return ${fullEquation.replace(/x/g, '*')}`)();
            setDisplay(String(Number(result.toFixed(8))));
            setEquation('');
            setIsDone(true);
        } catch (e) {
            setDisplay('Error');
            setEquation('');
            setIsDone(true);
        }
    };

    const buttons = [
        { label: 'C', onClick: handleClear, type: 'clear' },
        { label: 'Del', onClick: handleBackspace, type: 'clear' },
        { label: '/', onClick: () => handleOperator('/'), type: 'operator' },
        { label: 'x', onClick: () => handleOperator('x'), type: 'operator' },
        { label: '7', onClick: () => handleNumber('7') },
        { label: '8', onClick: () => handleNumber('8') },
        { label: '9', onClick: () => handleNumber('9') },
        { label: '-', onClick: () => handleOperator('-'), type: 'operator' },
        { label: '4', onClick: () => handleNumber('4') },
        { label: '5', onClick: () => handleNumber('5') },
        { label: '6', onClick: () => handleNumber('6') },
        { label: '+', onClick: () => handleOperator('+'), type: 'operator' },
        { label: '1', onClick: () => handleNumber('1') },
        { label: '2', onClick: () => handleNumber('2') },
        { label: '3', onClick: () => handleNumber('3') },
        { label: '=', onClick: handleEqual, type: 'equal', rowSpan: 2 },
        { label: '0', onClick: () => handleNumber('0'), colSpan: 2 },
        { label: '.', onClick: () => handleNumber('.') },
    ];

    return (
        <div className="calculator-panel shadow-2xl animate-fade-in border border-slate-200">
            <div className="calculator-header flex justify-between items-center p-4 bg-slate-50 border-b">
                <div className="flex items-center gap-2">
                    <Hash className="w-5 h-5 text-indigo-600" />
                    <span className="font-bold text-slate-700">Calculatrice</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg transition-colors text-slate-500">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="calculator-display p-6 bg-white text-right">
                <div className="text-slate-400 text-sm h-6 overflow-hidden text-ellipsis">{equation}</div>
                <div className="text-3xl font-bold text-slate-800 break-all">{display}</div>
            </div>

            <div className="calculator-grid p-4 grid grid-cols-4 gap-2 bg-slate-50">
                {buttons.map((btn, i) => (
                    <button
                        key={i}
                        onClick={btn.onClick}
                        className={`
              p-4 rounded-xl font-bold transition-all text-lg flex items-center justify-center
              ${btn.type === 'operator' ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' :
                                btn.type === 'clear' ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' :
                                    btn.type === 'equal' ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200' :
                                        'bg-white text-slate-700 hover:bg-slate-100 shadow-sm border border-slate-100'}
              ${btn.colSpan === 2 ? 'col-span-2' : ''}
              ${btn.rowSpan === 2 ? 'row-span-2' : ''}
            `}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
