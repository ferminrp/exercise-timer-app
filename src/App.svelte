<script>
    import Form from "./Form.svelte";
    import Timer from "./Timer.svelte";
    let exerciseTime = 20;
    let exerciseAmount = 4;
    let series = 3;
    let restTime = 10;
    let resetTime = 5;
    let timer = "Get Ready!";
    let exercising = false;
    let mode;

    // utility function for timeouts
    const delay = (ms) => new Promise((res) => setTimeout(res, ms));

    function start() {
        console.log("starting!");
        exercising = true;
        preWorkoutTimer();
        // Por cada serie
    }

    function cancel() {
        exercising = false;
        mode = null;
    }

    async function preWorkoutTimer() {
        timer = "Get Ready";
        await delay(1000);
        timer = "Set!";
        await delay(1000);
        timer = "Go!";
        await delay(1000);
        doSeries();
    }

    async function doSeries() {
        await delay(1000);
        for (let index = 0; index < series; index++) {
            if (exercising == false) {
                break;
            }
            console.log(`Serie ${index + 1} de ${series}`);

            // Por cada ejercicio
            for (let index = 0; index < exerciseAmount; index++) {
                if (exercising == false) {
                    mode = null;
                    break;
                }
                console.log(`Ejercicio ${index + 1} de ${exerciseAmount}`);
                // Timer del ejercicio
                mode = 'activity'
                await exerciseTimer(exerciseTime, "activity");
                // Timer del descanso
                mode = 'rest'
                exerciseTimer(restTime, "rest");
                await delay(restTime * 1000);
            }
            exerciseTimer(resetTime, "reset");
            await delay(resetTime * 1000);
            // Timer entre series
        }
    }

    async function exerciseTimer(time, type) {
        if (exercising == false) {
            mode = null;
            return "";
        }
        let totalSeconds = time;
        if (type == "activity") {
            timer = "Go! " + totalSeconds + " seconds left";
        } else if (type == "rest") {
            timer = "Rest for " + totalSeconds + " seconds";
        }

        for (let index = 0; index < time; index++) {
            if (exercising == false) {
                mode = null;
                break;
            }
            if (type == "activity" && exercising == true) {
                timer = "Go! " + totalSeconds + " seconds left";
                totalSeconds--;
                await delay(1000);
            } else if (type == "rest" && exercising == true) {
                timer = "Rest for " + totalSeconds + " seconds";
                totalSeconds--;
                await delay(1000);
            } else if (type == "reset" && exercising == true) {
                timer = totalSeconds + " seconds until next series";
                totalSeconds--;
                await delay(1000);
            }
        }
    }
</script>

<main class="{mode}">
    {#if !exercising}
        <Form
            {exerciseTime}
            {series}
            {exerciseAmount}
            {restTime}
            {resetTime}
            on:start={start}
        />
    {:else}
        <Timer {mode} {timer} {exercising} on:cancel={cancel} />
    {/if}
</main>

<style>
    main {
        margin: 0px;
        width: 100%;
        height: 100%;
        padding: 3rem;
    }

    .rest {
        background-color: #65e645;
    }

    .activity {
        background-color: #f56e6e;
    }
</style>
