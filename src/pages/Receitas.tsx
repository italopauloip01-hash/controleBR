import IncomeForm from '../components/IncomeForm';

export default function Receitas() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-6 animate-in fade-in duration-500">
            <div className="w-full max-w-2xl">
                <IncomeForm />
            </div>
        </div>
    );
}
