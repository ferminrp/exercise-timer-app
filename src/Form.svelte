<script>
    import {createEventDispatcher} from 'svelte'
    const dispatcher = createEventDispatcher();
    export let exerciseTime;
    export let series;
    export let exerciseAmount;
    export let restTime;
    export let resetTime;

    function start() {
        dispatcher('start');
    }
</script>

<div>
    <h1>Timer de Prueba</h1>

    <label for="exerciseAmount">Cuantos ejercicios vas a hacer?</label>
    <input
        name="exerciseAmount"
        bind:value={exerciseAmount}
        id="exerciseAmount"
        type="text"
    />

    <label for="series">Cuantos series vas a hacer?</label>
    <input name="series" bind:value={series} id="series" type="text" />

    <label for="exerciseTime">Cuantos segundos dura cada ejercicio?</label>
    <input
        name="exerciseTime"
        bind:value={exerciseTime}
        id="exerciseTime"
        type="text"
    />

    <label for="restTime"
        >Cuantos segundos de descanso entre cada ejercicio?</label
    >
    <input name="restTime" bind:value={restTime} id="restTime" type="text" />

    <label for="resetTime">Cuantos segundos entre cada serie?</label>
    <input name="resetTime" bind:value={resetTime} id="resetTime" type="text" />

    <p>Vas a hacer {exerciseAmount} ejercicios</p>
    <p>Vas a hacer {series} series</p>
    <p>Cada ejercicio va a durar {exerciseTime} segundos</p>
    <p>El tiempo de descanso entre ejercicios es de {restTime} segundos</p>
    <p>El tiempo entre series es de {resetTime} segundos</p>
</div>

<button on:click={start}>Start</button>

<style>
    label {
        margin-bottom: 1rem;
    }

    input {
        width: 20rem;
    }

    p {
        margin-bottom: 1rem;
    }
</style>
