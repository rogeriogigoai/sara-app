import { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { CSVLink } from 'react-csv';

const VehiclesList = () => {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [csvData, setCsvData] = useState<any[]>([]);
    const db = getFirestore();

    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const q = query(collection(db, 'vehicles'), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const vehiclesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setVehicles(vehiclesList);
            } catch (error) {
                console.error("Erro ao buscar veículos:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchVehicles();
    }, [db]);

    // Prepara os dados para o formato CSV
    useEffect(() => {
        if (vehicles.length > 0) {
            const dataForCsv: any[] = [];
            const headers = ["Placa", "Posição Pneu", "DOT", "Semana", "Ano", "Condição", "Data de Criação"];
            dataForCsv.push(headers);

            vehicles.forEach(vehicle => {
                const createdAt = vehicle.createdAt?.toDate().toLocaleString('pt-BR') || 'N/A';
                if (vehicle.currentTires && vehicle.currentTires.length > 0) {
                    vehicle.currentTires.forEach((tire: any) => {
                        dataForCsv.push([
                            vehicle.plate,
                            tire.position,
                            tire.dot,
                            tire.week,
                            tire.year,
                            tire.condition,
                            createdAt
                        ]);
                    });
                }
            });
            setCsvData(dataForCsv);
        }
    }, [vehicles]);


    return (
        <div className="text-white">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold">Frota de Veículos</h1>
                {csvData.length > 1 && (
                    <CSVLink
                        data={csvData}
                        filename={"sara_frota_veiculos.csv"}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Exportar para Excel
                    </CSVLink>
                )}
            </div>
            <p className="text-gray-400 mt-2">Veja e exporte todos os veículos registrados no sistema.</p>

            <div className="mt-8 bg-gray-800 rounded-lg">
                <ul className="divide-y divide-gray-700">
                    {loading ? <li className="p-4 text-center">Carregando frota...</li> : vehicles.map(vehicle => (
                        <li key={vehicle.id} className="p-4">
                            <p className="font-semibold text-lg">{vehicle.plate}</p>
                            <p className="text-sm text-gray-400">Cadastrado em: {vehicle.createdAt?.toDate().toLocaleDateString('pt-BR')}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default VehiclesList;
