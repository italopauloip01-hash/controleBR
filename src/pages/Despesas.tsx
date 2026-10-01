import ExpenseForm from '../components/ExpenseForm';

export default function Despesas() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-6 animate-in fade-in duration-500">
            <div className="w-full max-w-2xl">
                <ExpenseForm />
            </div>
        </div>
    );
}
