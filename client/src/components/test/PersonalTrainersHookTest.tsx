// client/src/components/test/PersonalTrainersHookTest.tsx
import React from 'react';
import { usePersonalTrainers } from '../../hooks/usePersonalTrainers';

/**
 * Test component to verify usePersonalTrainers hook functionality
 * This component demonstrates the deep immutability guarantees of the hook
 */
export function PersonalTrainersHookTest() {
  const { 
    personals, 
    loading, 
    error, 
    fetchPersonals, 
    refreshPersonals, 
    updatePersonal 
  } = usePersonalTrainers();

  // Test function to verify deep immutability
  const testImmutability = () => {
    console.log('🧪 Testing deep immutability...');
    
    if (personals.length > 0) {
      const firstPersonal = personals[0];
      const personalsBefore = [...personals];
      
      console.log('Original personal (before):', firstPersonal);
      console.log('All personals references before:', personalsBefore.map(p => p._id));
      
      // Attempt to mutate the original object (this should not affect the hook's state)
      try {
        // @ts-ignore - intentionally testing mutation
        firstPersonal.nome = 'MUTATED NAME';
        console.log('Attempted mutation on first personal');
      } catch (err) {
        console.log('Mutation prevented:', err);
      }
      
      // Test the updatePersonal function
      const updatedPersonal = {
        ...firstPersonal,
        nome: 'Test Updated Name',
        email: 'test@updated.com'
      };
      
      console.log('Testing updatePersonal with:', updatedPersonal);
      updatePersonal(updatedPersonal);
      
      // Check if objects have different references after update
      setTimeout(() => {
        const newPersonals = [...personals];
        console.log('All personals references after update:', newPersonals.map(p => p._id));
        console.log('Reference equality test:', personalsBefore[0] === newPersonals[0] ? 'FAILED - Same reference' : 'PASSED - Different references');
      }, 100);
    }
  };

  const testRefresh = async () => {
    console.log('🔄 Testing refresh functionality...');
    try {
      await refreshPersonals();
      console.log('✅ Refresh completed successfully');
    } catch (err) {
      console.error('❌ Refresh failed:', err);
    }
  };

  return (
    <div style={{ padding: '20px', border: '2px solid #ddd', margin: '20px', borderRadius: '8px' }}>
      <h3>🧪 Personal Trainers Hook Test</h3>
      
      <div style={{ marginBottom: '16px' }}>
        <strong>Status:</strong>
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Error: {error || 'None'}</div>
        <div>Personal Trainers Count: {personals.length}</div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <button 
          onClick={testImmutability}
          disabled={loading || personals.length === 0}
          style={{ marginRight: '8px', padding: '8px 16px' }}
        >
          Test Deep Immutability
        </button>
        
        <button 
          onClick={testRefresh}
          disabled={loading}
          style={{ marginRight: '8px', padding: '8px 16px' }}
        >
          Test Refresh
        </button>
        
        <button 
          onClick={fetchPersonals}
          disabled={loading}
          style={{ padding: '8px 16px' }}
        >
          Test Fetch
        </button>
      </div>

      {loading && <div>🔄 Loading personal trainers...</div>}
      
      {error && (
        <div style={{ color: 'red', padding: '8px', backgroundColor: '#ffeaea' }}>
          ❌ Error: {error}
        </div>
      )}

      {personals.length > 0 && (
        <div>
          <h4>First Personal Trainer (for testing):</h4>
          <pre style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '8px' }}>
            {JSON.stringify(personals[0], null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
        Check browser console for detailed immutability test results
      </div>
    </div>
  );
}