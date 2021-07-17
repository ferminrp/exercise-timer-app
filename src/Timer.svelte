<script>
    // import dispatcher
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
    export let timer;
    export let mode;
    
    function cancel() {
        dispatch('cancel')
    }

</script>

<h2 class="{mode}" id="timer">{timer}</h2>
<button on:click={cancel}>Cancel</button>

<style>
    .activity {
        color: white;
    }
</style>